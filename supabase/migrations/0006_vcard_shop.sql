-- 0006 vcard_shop: products + orders + line items

create table if not exists public.vcard_products (
  id           uuid primary key default gen_random_uuid(),
  sku          text unique not null,                          -- card-pvc|card-metal|card-custom|keychain|stickers-5|bundle-starter|team-5pack|card-replacement|verified-badge
  name         text not null,
  description  text,
  price_cents  integer not null,
  currency     text not null default 'usd',
  stripe_price_id text unique,
  active       boolean not null default true,
  metadata     jsonb default '{}'::jsonb,                     -- { color, finish, gates_verified: true, ... }
  created_at   timestamptz not null default now()
);

create table if not exists public.vcard_orders (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users(id) on delete set null,
  email        text not null,
  stripe_session_id text unique,
  stripe_payment_intent text,
  status       text not null default 'pending',               -- pending|paid|fulfilled|shipped|delivered|refunded|canceled
  subtotal_cents integer not null,
  tax_cents      integer not null default 0,
  shipping_cents integer not null default 0,
  total_cents    integer not null,
  currency       text not null default 'usd',
  shipping_address jsonb,
  tracking_number  text,
  carrier          text,
  shipped_at       timestamptz,
  delivered_at     timestamptz,
  created_at       timestamptz not null default now()
);
create index if not exists vcard_orders_user_idx on public.vcard_orders (user_id);

create table if not exists public.vcard_order_items (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references public.vcard_orders(id) on delete cascade,
  product_id  uuid references public.vcard_products(id),
  sku         text not null,
  qty         int not null check (qty > 0),
  price_cents integer not null,
  metadata    jsonb default '{}'::jsonb
);

alter table public.vcard_orders enable row level security;
drop policy if exists vcard_orders_owner_read on public.vcard_orders;
create policy vcard_orders_owner_read on public.vcard_orders
  for select to authenticated using (auth.uid() = user_id);

alter table public.vcard_order_items enable row level security;
drop policy if exists vcard_order_items_owner_read on public.vcard_order_items;
create policy vcard_order_items_owner_read on public.vcard_order_items
  for select to authenticated using (
    exists (select 1 from public.vcard_orders o where o.id = order_id and o.user_id = auth.uid())
  );

alter table public.vcard_products enable row level security;
drop policy if exists vcard_products_public_read on public.vcard_products;
create policy vcard_products_public_read on public.vcard_products
  for select to anon, authenticated using (active = true);
