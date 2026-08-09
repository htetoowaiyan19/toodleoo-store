# Next Steps: Supabase & Project Setup Guide

This guide walks you through setting up Supabase, configuring environment variables, running database migrations, establishing your admin account, and testing the application locally and in production.

---

## 📋 Checklist & Instructions

### Step 1: Create a Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard) and create a new free project.
2. Once created, navigate to **Project Settings > API**.
3. Copy the following credentials:
   - **Project URL**
   - **`anon` public key**
4. Create a `.env.local` file in the root of your project directory:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

---

### Step 2: Database Schema & Secure Logic Setup

1. In the Supabase Dashboard, open the **SQL Editor**.
2. Click **New Query**.
3. Open the schema file located in your project at `supabase/schema.sql`.
4. Copy all of its content and paste it into the Supabase SQL Editor.
5. Click **Run**.

> **What this does:**
> - Creates tables: `profiles`, `products`, `orders`, `payments`, `wallet_transactions`, `notifications`, and `admin_wallet_accounts`.
> - Sets up Row Level Security (RLS) policies to protect data access.
> - Configures secure database RPC functions for cart checkout (`create_order_from_cart`), payment reviews (`review_manual_payment`), and order delivery (`deliver_manual_order`).
> - Adds a database trigger to automatically create a customer profile upon user sign-up.

---

### Step 3: Configure Storage for Manual Payment Receipts

1. In the Supabase Dashboard, go to **Storage**.
2. Click **Create a new bucket**.
3. Name the bucket: `receipts`
4. Set Bucket Access to **Private**.
5. Save the bucket.

*(Note: Authenticated users will upload screenshots to `{user_id}/{payment_id}-{filename}`, and signed URLs will be dynamically generated for staff review).*

---

### Step 4: Create the First Owner (Admin) Account

1. Start your application locally (see Step 6) and sign up for a new user account through the `/login` page on the website.
2. In the Supabase Dashboard, go to **Table Editor** > `profiles`.
3. Locate your user row.
4. Update the `role` column value from `'customer'` to `'owner'`:

```sql
UPDATE public.profiles 
SET role = 'owner' 
WHERE email = 'your-email@example.com';
```

---

### Step 5: Configure Admin Wallet Account (for KPay / WavePay / Manual Payments)

Insert your receiving phone number/display name into `admin_wallet_accounts` via the Supabase SQL Editor or Table Editor:

```sql
INSERT INTO public.admin_wallet_accounts (display_name, phone_number, is_active)
VALUES ('Primary Admin Wallet (KPay / WavePay)', '+95 9 000 000 000', true);
```

---

### Step 6: Local Development & Verification

1. Run the development server:

```bash
npm run dev
```

2. Open the URL provided in the console (usually `http://localhost:5173`).
3. Complete the manual verification flow:
   - [ ] Sign up / Sign in.
   - [ ] Navigate to `/admin/products` as an **owner** and create a product with initial stock.
   - [ ] Add product to cart and test **Wallet Checkout** (should fail if balance is 0).
   - [ ] Perform a **Wallet Recharge / Manual Payment** submission by attaching a receipt screenshot.
   - [ ] Go to `/admin/payments` to **Approve** the payment.
   - [ ] Confirm wallet balance increases or order updates to `paid`.
   - [ ] Go to `/admin/orders` to enter delivery message/text and mark as **Delivered**.
   - [ ] Check customer notifications and order status.

---

### Step 7: Build & Deployment

1. Build the production package:

```bash
npm run build
```

2. Deploy the `dist/` directory to your static host of choice (Vercel, Netlify, Cloudflare Pages, etc.).
3. Ensure to set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as environment variables on your deployment platform settings.

---

## 🚀 Summary of Key Architecture Decisions

- **Zero Cloud Function Costs:** Transactional logic (stock reservation, wallet balance debit/credit, order creation) is executed inside atomic PostgreSQL database functions (RPC) protected by `SECURITY DEFINER` and Row Level Security.
- **MMK Integer Storage:** All prices and wallet balances are stored as integer MMK (Kyat) to avoid floating-point inaccuracies.
- **Secure File Storage:** Storage access control ensures receipts are only readable by the uploader and admins via signed temporal URLs.
