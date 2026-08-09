-- ================================================================================================================
-- TOODLEOO STORE - LATEST BACKEND PL/pgSQL FUNCTIONS WITH PRODUCTS & ITEMS SPLIT
-- ================================================================================================================

-- 1. validate_coupon
create or replace function public.validate_coupon(
  p_code text,
  p_cart_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := upper(trim(p_code));
  c record;
  item jsonb;
  item_id_text text;
  item_uuid uuid;
  prod_uuid uuid;
  prod_cat text;
  prod_tags text[];
  v_price integer;
  qty integer;
  item_eligible boolean;
  item_total integer;
  eligible_subtotal integer := 0;
  cart_subtotal integer := 0;
  discount_amount integer := 0;
begin
  if auth.uid() is null then
    return jsonb_build_object('valid', false, 'message', 'Sign in required to apply coupons');
  end if;

  if v_code is null or v_code = '' then
    return jsonb_build_object('valid', false, 'message', 'Coupon code is required');
  end if;

  select * into c
  from public.coupons
  where upper(code) = v_code;

  if c.id is null then
    return jsonb_build_object('valid', false, 'message', 'Invalid coupon code');
  end if;

  if not c.is_active then
    return jsonb_build_object('valid', false, 'message', 'Coupon code is deactivated');
  end if;

  if c.expires_at is not null and c.expires_at <= now() then
    return jsonb_build_object('valid', false, 'message', 'Coupon code has expired');
  end if;

  if c.max_uses is not null and c.current_uses >= c.max_uses then
    return jsonb_build_object('valid', false, 'message', 'Coupon limit reached');
  end if;

  if exists (
    select 1 from public.coupon_redemptions
    where coupon_id = c.id and user_id = auth.uid()
  ) then
    return jsonb_build_object('valid', false, 'message', 'Coupon already redeemed by your account');
  end if;

  if p_cart_items is not null and jsonb_array_length(p_cart_items) > 0 then
    for item in select * from jsonb_array_elements(p_cart_items)
    loop
      item_id_text := item->>'itemId';
      if item_id_text is null or item_id_text = '' then
        item_id_text := item->>'id';
      end if;

      qty := greatest(1, coalesce((item->>'quantity')::integer, 1));
      v_price := coalesce((item->>'priceMmk')::integer, 0);
      item_eligible := false;

      if item_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        item_uuid := item_id_text::uuid;

        select i.price_mmk, i.product_id, p.category, p.tags
        into v_price, prod_uuid, prod_cat, prod_tags
        from public.items i
        join public.products p on p.id = i.product_id
        where i.id = item_uuid;

        if v_price is null then
          v_price := coalesce((item->>'priceMmk')::integer, 0);
        end if;

        if c.discount_type = 'global' then
          item_eligible := true;
        elsif c.discount_type = 'type' then
          if (c.target_value <> '' and (c.target_value = prod_cat or (prod_tags is not null and c.target_value = any(prod_tags)))) then
            item_eligible := true;
          end if;
        elsif c.discount_type = 'selection' then
          if (c.product_ids is not null and (prod_uuid::text = any(c.product_ids) or item_id_text = any(c.product_ids))) then
            item_eligible := true;
          end if;
        end if;
      else
        if c.discount_type = 'global' then
          item_eligible := true;
        end if;
      end if;

      item_total := v_price * qty;
      cart_subtotal := cart_subtotal + item_total;

      if item_eligible then
        eligible_subtotal := eligible_subtotal + item_total;
      end if;
    end loop;
  end if;

  if eligible_subtotal <= 0 then
    return jsonb_build_object(
      'valid', false,
      'message', 'Coupon is not applicable to any items in your cart'
    );
  end if;

  discount_amount := round(eligible_subtotal * (c.discount_percent::numeric / 100.0))::integer;

  return jsonb_build_object(
    'valid', true,
    'coupon_id', c.id,
    'code', c.code,
    'discount_percent', c.discount_percent,
    'discount_type', c.discount_type,
    'discount_amount_mmk', discount_amount,
    'message', format('Coupon %s applied (%s%% OFF)', c.code, c.discount_percent)
  );
end;
$$;


-- 2. create_order_from_cart
create or replace function public.create_order_from_cart(
  cart_items jsonb,
  payment_source_input text,
  coupon_code_input text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  order_id uuid;
  item jsonb;
  item_id_text text;
  item_uuid uuid;
  current_stock integer;
  item_status text;
  item_price integer;
  prod_name text;
  current_wallet integer;
  qty integer;
  item_total integer;
  server_subtotal_mmk integer := 0;
  final_total_mmk integer := 0;
  discount_amount_mmk integer := 0;
  coupon_validation jsonb;
  coupon_id_val uuid;
begin
  if auth.uid() is null then
    raise exception 'Sign in required';
  end if;

  if cart_items is null or jsonb_array_length(cart_items) = 0 then
    raise exception 'Cart is empty';
  end if;

  if payment_source_input not in ('wallet', 'manual_payment') then
    raise exception 'Invalid payment source';
  end if;

  for item in select * from jsonb_array_elements(cart_items)
  loop
    item_id_text := item->>'itemId';
    if item_id_text is null or item_id_text = '' then
      item_id_text := item->>'id';
    end if;

    qty := greatest(1, coalesce((item->>'quantity')::integer, 1));

    if item_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      item_uuid := item_id_text::uuid;

      select i.stock, i.status, i.price_mmk, p.name
      into current_stock, item_status, item_price, prod_name
      from public.items i
      join public.products p on p.id = i.product_id
      where i.id = item_uuid
      for update;

      if item_status <> 'pre-order' and item_status <> 'preorder' then
        if current_stock is not null and current_stock < qty then
          raise exception 'Not enough stock for %', coalesce(prod_name, item->>'name', 'product');
        end if;
      end if;

      item_total := coalesce(item_price, (item->>'priceMmk')::integer, 0) * qty;
    else
      item_total := coalesce((item->>'priceMmk')::integer, 0) * qty;
    end if;

    server_subtotal_mmk := server_subtotal_mmk + item_total;
  end loop;

  final_total_mmk := server_subtotal_mmk;

  if coupon_code_input is not null and trim(coupon_code_input) <> '' then
    coupon_validation := public.validate_coupon(coupon_code_input, cart_items);

    if (coupon_validation->>'valid')::boolean is true then
      coupon_id_val := (coupon_validation->>'coupon_id')::uuid;
      discount_amount_mmk := coalesce((coupon_validation->>'discount_amount_mmk')::integer, 0);
      final_total_mmk := greatest(0, server_subtotal_mmk - discount_amount_mmk);
    else
      raise exception '%', coalesce(coupon_validation->>'message', 'Invalid coupon code');
    end if;
  end if;

  select wallet_balance into current_wallet
  from public.profiles
  where id = auth.uid()
  for update;

  if payment_source_input = 'wallet' then
    if current_wallet is null or current_wallet < final_total_mmk then
      raise exception 'Wallet balance is not enough';
    end if;

    update public.profiles
    set wallet_balance = wallet_balance - final_total_mmk
    where id = auth.uid();
  end if;

  insert into public.orders (
    user_id,
    user_email,
    items,
    total_mmk,
    payment_source,
    status,
    is_submitted
  )
  values (
    auth.uid(),
    coalesce((select email from public.profiles where id = auth.uid()), auth.jwt()->>'email', 'customer@toodleoo.store'),
    cart_items,
    final_total_mmk,
    payment_source_input,
    case when payment_source_input = 'wallet' then 'paid' else 'pending_payment' end,
    case when payment_source_input = 'wallet' then true else false end
  )
  returning id into order_id;

  if coupon_id_val is not null then
    insert into public.coupon_redemptions (coupon_id, user_id, order_id)
    values (coupon_id_val, auth.uid(), order_id)
    on conflict do nothing;

    update public.coupons
    set current_uses = current_uses + 1
    where id = coupon_id_val;
  end if;

  if payment_source_input = 'wallet' then
    for item in select * from jsonb_array_elements(cart_items)
    loop
      item_id_text := item->>'itemId';
      if item_id_text is null or item_id_text = '' then
        item_id_text := item->>'id';
      end if;

      qty := greatest(1, coalesce((item->>'quantity')::integer, 1));

      if item_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
        item_uuid := item_id_text::uuid;

        select status into item_status from public.items where id = item_uuid;

        if item_status <> 'pre-order' and item_status <> 'preorder' then
          update public.items
          set stock = greatest(0, stock - qty),
              updated_at = now()
          where id = item_uuid;
        end if;
      end if;
    end loop;

    insert into public.wallet_transactions (
      user_id,
      type,
      amount_mmk,
      status,
      order_id
    )
    values (
      auth.uid(),
      'purchase_debit',
      final_total_mmk,
      'approved',
      order_id
    );
  end if;

  return order_id;
end;
$$;


-- 3. review_manual_payment
create or replace function public.review_manual_payment(
  payment_id_input uuid,
  review_note_input text,
  status_input text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  payment_record public.payments%rowtype;
  order_record public.orders%rowtype;
  item jsonb;
  item_id_text text;
  item_uuid uuid;
  item_record public.items%rowtype;
  qty integer;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  if status_input not in ('approved', 'rejected') then
    raise exception 'Invalid review status';
  end if;

  select * into payment_record
  from public.payments
  where id = payment_id_input
  for update;

  if payment_record.status <> 'submitted' then
    raise exception 'Payment cannot be reviewed';
  end if;

  update public.payments
  set status = status_input,
      reviewed_by = auth.uid(),
      review_note = review_note_input,
      reviewed_at = now()
  where id = payment_id_input;

  if status_input = 'approved' and payment_record.purpose = 'wallet_topup' then
    update public.profiles
    set wallet_balance = wallet_balance + payment_record.amount_mmk
    where id = payment_record.user_id;

    insert into public.wallet_transactions (
      user_id,
      type,
      amount_mmk,
      status,
      payment_id,
      created_by
    )
    values (
      payment_record.user_id,
      'topup_approved',
      payment_record.amount_mmk,
      'approved',
      payment_id_input,
      auth.uid()
    );
  end if;

  if payment_record.order_id is not null then
    if status_input = 'approved' then
      select * into order_record
      from public.orders
      where id = payment_record.order_id
      for update;

      for item in select * from jsonb_array_elements(order_record.items)
      loop
        item_id_text := item->>'itemId';
        if item_id_text is null or item_id_text = '' then
          item_id_text := item->>'id';
        end if;

        qty := greatest(1, coalesce((item->>'quantity')::integer, 1));

        if item_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
          item_uuid := item_id_text::uuid;

          select * into item_record
          from public.items
          where id = item_uuid
          for update;

          if item_record.status <> 'pre-order' and item_record.status <> 'preorder' then
            update public.items
            set stock = greatest(0, stock - qty),
                updated_at = now()
            where id = item_uuid;
          end if;
        end if;
      end loop;
    end if;

    update public.orders
    set status = case when status_input = 'approved' then 'paid' else 'rejected' end
    where id = payment_record.order_id;
  end if;

  insert into public.notifications (user_id, audience, type, title, message)
  values (
    payment_record.user_id,
    'customer',
    'payment_reviewed',
    case when status_input = 'approved' then 'Payment Approved' else 'Payment Rejected' end,
    case
      when status_input = 'approved' then 'Your payment receipt was approved.'
      else coalesce(review_note_input, 'Your payment receipt was rejected.')
    end
  );
end;
$$;

-- 4. reject_and_refund_order
create or replace function public.reject_and_refund_order(
  order_id_input uuid,
  reason_input text default ''
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  ord public.orders%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Admin access required';
  end if;

  select * into ord
  from public.orders
  where id = order_id_input
  for update;

  if ord.id is null then
    raise exception 'Order not found';
  end if;

  if ord.status = 'rejected' or ord.status = 'cancelled' then
    raise exception 'Order is already cancelled or rejected';
  end if;

  if ord.payment_source = 'wallet' then
    update public.profiles
    set wallet_balance = wallet_balance + ord.total_mmk
    where id = ord.user_id;

    insert into public.wallet_transactions (
      user_id,
      type,
      amount_mmk,
      status,
      order_id,
      created_by
    )
    values (
      ord.user_id,
      'order_refund',
      ord.total_mmk,
      'approved',
      order_id_input,
      auth.uid()
    );
  end if;

  update public.orders
  set status = 'rejected',
      delivery_message = coalesce(nullif(trim(reason_input), ''), 'Order rejected by admin. Wallet balance refunded.')
  where id = order_id_input;

  insert into public.notifications (user_id, audience, type, title, message)
  values (
    ord.user_id,
    'customer',
    'order_rejected',
    'Order Rejected & Refunded',
    coalesce(nullif(trim(reason_input), ''), 'Your order was rejected and your wallet balance has been refunded.')
  );
end;
$$;

