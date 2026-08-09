-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text,
  display_name text,
  role text NOT NULL DEFAULT 'customer'::text CHECK (role = ANY (ARRAY['customer'::text, 'staff'::text, 'owner'::text])),
  wallet_balance integer NOT NULL DEFAULT 0 CHECK (wallet_balance >= 0),
  disabled boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.products (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  category text NOT NULL DEFAULT 'Digital'::text,
  platform text NOT NULL DEFAULT 'Manual'::text,
  product_type text NOT NULL DEFAULT 'single'::text CHECK (product_type = ANY (ARRAY['single'::text, 'group'::text])),
  tags ARRAY NOT NULL DEFAULT '{}'::text[],
  delivery_type text NOT NULL DEFAULT 'manual_text'::text,
  featured boolean NOT NULL DEFAULT false,
  badge text,
  image text,
  gradient text,
  rating numeric NOT NULL DEFAULT 5,
  reviews integer NOT NULL DEFAULT 0,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT products_pkey PRIMARY KEY (id)
);
CREATE TABLE public.items (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL,
  name text NOT NULL DEFAULT ''::text,
  price_mmk integer NOT NULL CHECK (price_mmk >= 0),
  stock integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
  status text NOT NULL DEFAULT 'instock'::text CHECK (status = ANY (ARRAY['instock'::text, 'pre-order'::text, 'out-of-stock'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT items_pkey PRIMARY KEY (id),
  CONSTRAINT items_product_id_fkey FOREIGN KEY (product_id) REFERENCES public.products(id) ON DELETE CASCADE
);
CREATE TABLE public.coupons (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  discount_type text NOT NULL CHECK (discount_type = ANY (ARRAY['global'::text, 'type'::text, 'selection'::text])),
  discount_percent integer NOT NULL CHECK (discount_percent > 0 AND discount_percent <= 100),
  target_value text DEFAULT ''::text,
  product_ids ARRAY DEFAULT '{}'::text[],
  max_uses integer,
  current_uses integer NOT NULL DEFAULT 0,
  expires_at timestamp with time zone,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT coupons_pkey PRIMARY KEY (id)
);
CREATE TABLE public.coupon_redemptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  coupon_id uuid NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid,
  redeemed_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT coupon_redemptions_pkey PRIMARY KEY (id),
  CONSTRAINT coupon_redemptions_coupon_id_fkey FOREIGN KEY (coupon_id) REFERENCES public.coupons(id) ON DELETE CASCADE,
  CONSTRAINT coupon_redemptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
  CONSTRAINT coupon_redemptions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id) ON DELETE SET NULL,
  CONSTRAINT coupon_redemptions_user_coupon_unique UNIQUE (coupon_id, user_id)
);
CREATE TABLE public.orders (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total_mmk integer NOT NULL CHECK (total_mmk >= 0),
  payment_source text NOT NULL CHECK (payment_source = ANY (ARRAY['wallet'::text, 'manual_payment'::text])),
  status text NOT NULL DEFAULT 'pending_payment'::text,
  delivery_message text NOT NULL DEFAULT ''::text,
  delivered_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  delivered_at timestamp with time zone,
  is_submitted boolean NOT NULL DEFAULT false,
  receipt_image_path text DEFAULT ''::text,
  CONSTRAINT orders_pkey PRIMARY KEY (id),
  CONSTRAINT orders_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT orders_delivered_by_fkey FOREIGN KEY (delivered_by) REFERENCES public.profiles(id)
);
CREATE TABLE public.payments (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_email text,
  purpose text NOT NULL CHECK (purpose = ANY (ARRAY['wallet_topup'::text, 'order_payment'::text])),
  order_id uuid,
  amount_mmk integer NOT NULL CHECK (amount_mmk > 0),
  admin_wallet_account text,
  receipt_image_path text,
  status text NOT NULL DEFAULT 'submitted'::text CHECK (status = ANY (ARRAY['uploading'::text, 'submitted'::text, 'approved'::text, 'rejected'::text])),
  reviewed_by uuid,
  review_note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  CONSTRAINT payments_pkey PRIMARY KEY (id),
  CONSTRAINT payments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT payments_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id),
  CONSTRAINT payments_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id)
);
CREATE TABLE public.wallet_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  type text NOT NULL,
  amount_mmk integer NOT NULL CHECK (amount_mmk >= 0),
  status text NOT NULL DEFAULT 'approved'::text,
  payment_id uuid,
  order_id uuid,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT wallet_transactions_pkey PRIMARY KEY (id),
  CONSTRAINT wallet_transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id),
  CONSTRAINT wallet_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id),
  CONSTRAINT wallet_transactions_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.orders(id),
  CONSTRAINT wallet_transactions_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id)
);
CREATE TABLE public.notifications (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  audience text NOT NULL CHECK (audience = ANY (ARRAY['customer'::text, 'admin'::text])),
  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT notifications_pkey PRIMARY KEY (id),
  CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.admin_wallet_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  display_name text NOT NULL,
  phone_number text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT admin_wallet_accounts_pkey PRIMARY KEY (id)
);