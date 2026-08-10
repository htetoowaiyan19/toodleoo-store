-- ================================================================================================================
-- TOODLEOO STORE - SPLIT PRODUCTS & ITEMS SCHEMA (DDL & MIGRATION & PROCEDURES)
-- Run these statements in the Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ================================================================================================================

-- 1. ADD PRODUCT_TYPE & REQUIRED_FIELDS & PRICE_USD COLUMNS TO PRODUCTS TABLE IF NOT EXISTS
do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='product_type') then
    alter table public.products add column product_type text not null default 'single' check (product_type in ('single', 'group'));
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='required_fields') then
    alter table public.products add column required_fields jsonb not null default '[]'::jsonb;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='products' and column_name='price_usd') then
    alter table public.products add column price_usd numeric(10,2) not null default 0.00 check (price_usd >= 0);
  end if;
end $$;

-- STORE SETTINGS TABLE (EXCHANGE RATES & APP CONFIG)
create table if not exists public.store_settings (
  key text primary key,
  value text not null,
  updated_at timestamp with time zone not null default now()
);

alter table public.store_settings enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Store settings readable by all') then
    create policy "Store settings readable by all" on public.store_settings for select using (true);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Admins full access to store settings') then
    create policy "Admins full access to store settings" on public.store_settings for all using (public.is_admin());
  end if;
end $$;

insert into public.store_settings (key, value)
values ('usd_to_mmk_rate', '4500'), ('last_auto_sync_at', now()::text)
on conflict (key) do nothing;

-- 2. CREATE ITEMS TABLE
create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null default '',
  price_mmk integer not null check (price_mmk >= 0),
  price_usd numeric(10,2) not null default 0.00 check (price_usd >= 0),
  stock integer not null check (stock >= 0) default 0,
  status text not null check (status in ('instock', 'pre-order', 'out-of-stock')) default 'instock',
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

do $$
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='items' and column_name='price_usd') then
    alter table public.items add column price_usd numeric(10,2) not null default 0.00 check (price_usd >= 0);
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='total_usd') then
    alter table public.orders add column total_usd numeric(10,2) not null default 0.00;
  end if;

  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='orders' and column_name='exchange_rate_used') then
    alter table public.orders add column exchange_rate_used numeric(10,2) not null default 4500.00;
  end if;
end $$;


-- Enable RLS on Items Table
alter table public.items enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where policyname = 'Items readable by all') then
    create policy "Items readable by all" on public.items for select using (true);
  end if;

  if not exists (select 1 from pg_policies where policyname = 'Admins full access to items') then
    create policy "Admins full access to items" on public.items for all using (public.is_admin());
  end if;
end $$;

-- 3. MIGRATION SCRIPT: MIGRATE EXISTING PRODUCTS & VARIANTS TO ITEMS TABLE
do $$
declare
  p record;
  v jsonb;
  v_count integer;
  v_name text;
  v_price integer;
  v_stock integer;
  v_status text;
begin
  for p in select * from public.products loop
    -- Check if items already exist for this product
    select count(*) into v_count from public.items where product_id = p.id;

    if v_count = 0 then
      -- If product has JSONB variants array with > 0 elements
      if p.variants is not null and jsonb_typeof(p.variants) = 'array' and jsonb_array_length(p.variants) > 0 then
        update public.products set product_type = 'group' where id = p.id;

        for v in select * from jsonb_array_elements(p.variants) loop
          v_name := coalesce(v->>'name', 'Option');
          v_price := coalesce((v->>'price_mmk')::integer, (v->>'priceMmk')::integer, p.price_mmk, 0);
          v_stock := coalesce((v->>'stock')::integer, p.stock, 99);
          v_status := case when v_stock > 0 then 'instock' else 'out-of-stock' end;

          insert into public.items (product_id, name, price_mmk, stock, status)
          values (p.id, v_name, v_price, v_stock, v_status);
        end loop;
      else
        -- Single item product
        update public.products set product_type = 'single' where id = p.id;

        insert into public.items (product_id, name, price_mmk, stock, status)
        values (p.id, '', coalesce(p.price_mmk, 0), coalesce(p.stock, 0), coalesce(p.status, 'instock'));
      end if;
    end if;
  end loop;
end $$;

-- 4. DROP OLD FUNCTION SIGNATURES TO PREVENT POSTGREST RPC OVERLOAD CONFLICTS
drop function if exists public.validate_coupon(text, jsonb);
drop function if exists public.create_order_from_cart(jsonb, text, integer);
drop function if exists public.create_order_from_cart(jsonb, text, text);
drop function if exists public.create_order_from_cart(jsonb, text);

-- 5. VALIDATE COUPON RPC FUNCTION WITH ITEMS SUPPORT
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


-- 6. CREATE ORDER FROM CART RPC FUNCTION WITH USD BASE PRICING & Dynamic MMK Verification
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
  item_price_mmk integer;
  item_price_usd numeric(10,2);
  prod_name text;
  current_wallet integer;
  qty integer;
  item_total_mmk integer;
  item_total_usd numeric(10,2);
  server_subtotal_mmk integer := 0;
  server_subtotal_usd numeric(10,2) := 0.00;
  final_total_mmk integer := 0;
  discount_amount_mmk integer := 0;
  coupon_validation jsonb;
  coupon_id_val uuid;
  current_rate numeric(10,2) := 4500.00;
  rate_setting text;
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

  -- 0. Fetch current active exchange rate from store_settings
  select value into rate_setting from public.store_settings where key = 'usd_to_mmk_rate';
  if rate_setting is not null and rate_setting ~ '^[0-9]+(\.[0-9]+)?$' then
    current_rate := rate_setting::numeric;
  end if;

  -- 1. Calculate base subtotal & verify stock from public.items table
  for item in select * from jsonb_array_elements(cart_items)
  loop
    item_id_text := item->>'itemId';
    if item_id_text is null or item_id_text = '' then
      item_id_text := item->>'id';
    end if;

    qty := greatest(1, coalesce((item->>'quantity')::integer, 1));

    if item_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
      item_uuid := item_id_text::uuid;

      select i.stock, i.status, i.price_usd, i.price_mmk, p.name
      into current_stock, item_status, item_price_usd, item_price_mmk, prod_name
      from public.items i
      join public.products p on p.id = i.product_id
      where i.id = item_uuid
      for update;

      if item_status <> 'pre-order' and item_status <> 'preorder' then
        if current_stock is not null and current_stock < qty then
          raise exception 'Not enough stock for %', coalesce(prod_name, item->>'name', 'product');
        end if;
      end if;

      if item_price_usd is null or item_price_usd = 0.00 then
        if item_price_mmk is not null and item_price_mmk > 0 then
          item_price_usd := round((item_price_mmk / current_rate)::numeric, 2);
        else
          item_price_usd := coalesce((item->>'priceUsd')::numeric, (item->>'price_usd')::numeric, 0.00);
        end if;
      end if;

      item_price_mmk := round(item_price_usd * current_rate);
      item_total_mmk := item_price_mmk * qty;
      item_total_usd := item_price_usd * qty;
    else
      item_price_usd := coalesce((item->>'priceUsd')::numeric, (item->>'price_usd')::numeric, 0.00);
      item_price_mmk := round(item_price_usd * current_rate);
      if item_price_mmk = 0 then
        item_price_mmk := coalesce((item->>'priceMmk')::integer, 0);
      end if;
      item_total_mmk := item_price_mmk * qty;
      item_total_usd := item_price_usd * qty;
    end if;

    server_subtotal_mmk := server_subtotal_mmk + item_total_mmk;
    server_subtotal_usd := server_subtotal_usd + item_total_usd;
  end loop;

  final_total_mmk := server_subtotal_mmk;

  -- 2. Server-side coupon verification & discount application
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

  -- 3. Wallet balance check & debit
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

  -- 4. Create Order
  insert into public.orders (
    user_id,
    user_email,
    items,
    total_mmk,
    total_usd,
    exchange_rate_used,
    payment_source,
    status,
    is_submitted
  )
  values (
    auth.uid(),
    coalesce((select email from public.profiles where id = auth.uid()), auth.jwt()->>'email', 'customer@toodleoo.store'),
    cart_items,
    final_total_mmk,
    server_subtotal_usd,
    current_rate,
    payment_source_input,
    case when payment_source_input = 'wallet' then 'paid' else 'pending_payment' end,
    case when payment_source_input = 'wallet' then true else false end
  )
  returning id into order_id;


  -- 5. Record Coupon Redemption & Increment Coupon Usage
  if coupon_id_val is not null then
    insert into public.coupon_redemptions (coupon_id, user_id, order_id)
    values (coupon_id_val, auth.uid(), order_id)
    on conflict do nothing;

    update public.coupons
    set current_uses = current_uses + 1
    where id = coupon_id_val;
  end if;

  -- 6. Item stock reduction & wallet transaction if Wallet payment
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

-- 7. REJECT AND REFUND ORDER RPC FUNCTION
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

  -- Revert wallet balance if paid via wallet
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

  -- Update order status
  update public.orders
  set status = 'rejected',
      delivery_message = coalesce(nullif(trim(reason_input), ''), 'Order rejected by admin. Wallet balance refunded.')
  where id = order_id_input;

  -- Notify customer
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

