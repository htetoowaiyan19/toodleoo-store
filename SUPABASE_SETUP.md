# Supabase Setup

This version avoids Firebase billing and Cloud Functions. Supabase Postgres,
Row Level Security, Storage, and RPC functions handle the secure backend work.

References checked:

- Firebase Cloud Functions require the Blaze billing plan.
- Supabase Free includes a hosted Postgres database, Auth, Storage, and API usage suitable for a first launch.

## 1. Create Project

1. Create a free Supabase project.
2. Go to Project Settings > API.
3. Copy:
   - Project URL
   - anon public key
4. Put them in `.env` or `.env.local`:

```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

## 2. Run SQL Schema

Open Supabase SQL Editor and run:

`supabase/schema.sql`

This creates:

- profiles
- products
- orders
- payments
- wallet_transactions
- notifications
- admin_wallet_accounts
- secure RPC functions for checkout, payment review, and delivery
- Row Level Security policies

## 3. Create Receipt Bucket

Create a private Storage bucket named:

`receipts`

Then add Storage policies that allow:

- authenticated users to upload files under their own user id folder
- owners/staff to read receipt files
- users to read their own receipt files

## 4. First Owner User

1. Sign up through the website.
2. In Supabase Table Editor, open `profiles`.
3. Set your row:

```sql
role = 'owner'
```

## 5. Admin Wallet Account

Insert your manual payment phone number:

```sql
insert into public.admin_wallet_accounts (display_name, phone_number, is_active)
values ('Primary admin wallet', '+95 9 000 000 000', true);
```

## 6. Test

Run locally:

```bash
npm run dev
```

Then test:

- signup/login
- product creation from `/admin/products`
- cart checkout
- manual receipt upload
- admin payment approval
- wallet recharge
- wallet purchase
- delivery message

## 7. Deploy

For the frontend, deploy to Vercel, Netlify, Cloudflare Pages, or another static host.

Build command:

```bash
npm run build
```

Output directory:

```text
dist
```
