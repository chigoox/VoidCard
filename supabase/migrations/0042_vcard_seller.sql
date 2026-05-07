-- 0042 vcard_seller: user-owned storefronts via Stripe Connect.
-- Three tables: seller account (1:1 user), seller products (n per user), seller orders.

-- ----- Seller accounts -----
create table if not exists public.vcard_seller_accounts (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  stripe_account_id    text unique not null,
  account_type         text not null default 'express', -- express|standard|custom
  country              text,
  default_currency     text,
  details_submitted    boolean not null default false,
  charges_enabled      boolean not null default false,
  payouts_enabled      boolean not null default false,
  capabilities         jsonb default '{}'::jsonb,
  requirements         jsonb default '{}'::jsonb,
  metadata             jsonb default '{}'::jsonb,
  connected_at         timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create index if not exists vcard_seller_accounts_account_idx
  on public.vcard_seller_accounts (stripe_account_id);

alter table public.vcard_seller_accounts enable row level security;

drop policy if exists vcard_seller_accounts_owner_read on public.vcard_seller_accounts;
create policy vcard_seller_accounts_owner_read
  on public.vcard_seller_accounts
  for select to authenticated
  using (auth.uid() = user_id);

-- Inserts/updates always go through the service-role client; no policy needed for write.

-- ----- Seller products -----
create table if not exists public.vcard_seller_products (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid not null references auth.users(id) on delete cascade,
  name            text not null,
  description     text,
  image_url       text,
  price_cents     integer not null check (price_cents >= 0),
  currency        text not null default 'usd',
  inventory       integer,                                  -- null = unlimited
  shippable       boolean not null default false,
  digital         boolean not null default true,
  active          boolean not null default true,
  position        integer not null default 100,
  metadata        jsonb default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists vcard_seller_products_owner_idx
  on public.vcard_seller_products (owner_user_id, position);
create index if not exists vcard_seller_products_active_idx
  on public.vcard_seller_products (active) where active = true;

alter table public.vcard_seller_products enable row level security;

-- Public can read active products (so storefront sections render to anon visitors).
drop policy if exists vcard_seller_products_public_read on public.vcard_seller_products;
create policy vcard_seller_products_public_read
  on public.vcard_seller_products
  for select to anon, authenticated
  using (active = true);

-- Owner can read all (incl. inactive) for management.
drop policy if exists vcard_seller_products_owner_all on public.vcard_seller_products;
create policy vcard_seller_products_owner_all
  on public.vcard_seller_products
  for select to authenticated
  using (auth.uid() = owner_user_id);

-- Inserts/updates/deletes done through server actions w/ service-role client.

-- ----- Seller orders -----
create table if not exists public.vcard_seller_orders (
  id                       uuid primary key default gen_random_uuid(),
  seller_user_id           uuid not null references auth.users(id) on delete set null,
  buyer_user_id            uuid references auth.users(id) on delete set null,
  buyer_email              text,
  stripe_session_id        text unique,
  stripe_payment_intent    text,
  stripe_account_id        text not null,
  status                   text not null default 'pending', -- pending|paid|fulfilled|refunded|canceled
  subtotal_cents           integer not null,
  total_cents              integer not null,
  application_fee_cents    integer not null default 0,
  currency                 text not null default 'usd',
  items                    jsonb not null default '[]'::jsonb, -- snapshot of products at purchase
  shipping_address         jsonb,
  metadata                 jsonb default '{}'::jsonb,
  created_at               timestamptz not null default now()
);
create index if not exists vcard_seller_orders_seller_idx
  on public.vcard_seller_orders (seller_user_id, created_at desc);
create index if not exists vcard_seller_orders_buyer_idx
  on public.vcard_seller_orders (buyer_user_id);

alter table public.vcard_seller_orders enable row level security;

drop policy if exists vcard_seller_orders_seller_read on public.vcard_seller_orders;
create policy vcard_seller_orders_seller_read
  on public.vcard_seller_orders
  for select to authenticated
  using (auth.uid() = seller_user_id);

drop policy if exists vcard_seller_orders_buyer_read on public.vcard_seller_orders;
create policy vcard_seller_orders_buyer_read
  on public.vcard_seller_orders
  for select to authenticated
  using (auth.uid() = buyer_user_id);

-- ----- Default platform fee (basis points) -----
insert into public.vcard_settings (key, value)
values
  ('seller.platform_fee_bps', to_jsonb(500)),
  ('seller.platform_fee_bps_pro', to_jsonb(250)),
  ('seller.platform_fee_bps_team', to_jsonb(100))
on conflict (key) do nothing;
