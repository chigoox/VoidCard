-- 0025 vcard_cms: product seed, plans table, site settings KV
-- All shop products and subscription prices managed from admin instead of .env.

-- ---------------------------------------------------------------------------
-- Site-wide settings (key/value JSONB)
-- ---------------------------------------------------------------------------
create table if not exists public.vcard_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.vcard_settings enable row level security;
drop policy if exists vcard_settings_admin_all on public.vcard_settings;
create policy vcard_settings_admin_all on public.vcard_settings
  for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- Subscription plans (pro / team / enterprise)
-- ---------------------------------------------------------------------------
create table if not exists public.vcard_plans (
  id                   text primary key,             -- 'pro' | 'team' | 'enterprise'
  name                 text not null,
  blurb                text,
  monthly_cents        integer not null,
  yearly_cents         integer not null,
  stripe_price_monthly text,
  stripe_price_yearly  text,
  features             jsonb not null default '[]'::jsonb,  -- array of strings
  active               boolean not null default true,
  position             int not null default 0,
  updated_at           timestamptz not null default now()
);

alter table public.vcard_plans enable row level security;
drop policy if exists vcard_plans_public_read on public.vcard_plans;
create policy vcard_plans_public_read on public.vcard_plans
  for select to anon, authenticated using (active = true);
drop policy if exists vcard_plans_admin_all on public.vcard_plans;
create policy vcard_plans_admin_all on public.vcard_plans
  for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- Admin write policies on vcard_products (read policy already exists)
-- ---------------------------------------------------------------------------
drop policy if exists vcard_products_admin_all on public.vcard_products;
create policy vcard_products_admin_all on public.vcard_products
  for all to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Admin can read every order (existing policy is owner-only)
drop policy if exists vcard_orders_admin_read on public.vcard_orders;
create policy vcard_orders_admin_read on public.vcard_orders
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
drop policy if exists vcard_orders_admin_update on public.vcard_orders;
create policy vcard_orders_admin_update on public.vcard_orders
  for update to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  ) with check (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists vcard_order_items_admin_read on public.vcard_order_items;
create policy vcard_order_items_admin_read on public.vcard_order_items
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists vcard_subs_admin_read on public.vcard_subscriptions;
create policy vcard_subs_admin_read on public.vcard_subscriptions
  for select to authenticated using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- ---------------------------------------------------------------------------
-- Useful columns on products
-- ---------------------------------------------------------------------------
alter table public.vcard_products add column if not exists position int not null default 0;
alter table public.vcard_products add column if not exists badge text;
alter table public.vcard_products add column if not exists finish text;
alter table public.vcard_products add column if not exists ships text;
alter table public.vcard_products add column if not exists blurb text;

-- ---------------------------------------------------------------------------
-- Seed products (idempotent — preserves stripe_price_id once set)
-- ---------------------------------------------------------------------------
insert into public.vcard_products (sku, name, blurb, finish, ships, badge, price_cents, currency, active, position, metadata)
values
  ('card-pvc',         'VoidCard PVC',     'Matte black PVC with gold-foil VoidCard mark. The everyday hand-off.',           'PVC · Gold foil',           'Ships in 3–5 days',  null,                  1900, 'usd', true,  10, '{"verified_included":false}'::jsonb),
  ('card-metal',       'VoidCard Metal',   'Brushed stainless with a laser-etched monogram. Heavy in the hand.',             'Stainless · Laser etched',  'Ships in 5–7 days',  'Includes Verified',   2900, 'usd', true,  20, '{"verified_included":true}'::jsonb),
  ('card-custom',      'Custom Art',       'Your art, your finish. Requires Verified Badge before order.',                    'Custom · Foil/etch/print',  'Ships in 10–14 days','Verified-only',       4900, 'usd', true,  30, '{"verified_included":true,"requires_verified":true}'::jsonb),
  ('keychain',         'Keychain',         'NFC keychain in onyx leather. Same tap-to-share, fits on your keys.',             'Leather · NFC',             'Ships in 3–5 days',  null,                  1500, 'usd', true,  40, '{"verified_included":false}'::jsonb),
  ('stickers-5',       'Stickers (5)',     'Pack of five NFC stickers. Stick them on laptops, guitars, lockers.',             '5× NFC vinyl',              'Ships in 3–5 days',  null,                   900, 'usd', true,  50, '{"verified_included":false}'::jsonb),
  ('bundle-starter',   'Starter Bundle',   '1 metal card + keychain + 5 stickers. Best value for new founders.',              'Bundle',                    'Ships in 5–7 days',  'Includes Verified',   3500, 'usd', true,  60, '{"verified_included":true}'::jsonb),
  ('team-5pack',       'Team 5-Pack',      'Five metal cards, brand kit ready. Built for studios and crews.',                 '5× Stainless',              'Ships in 7–10 days', 'Includes Verified',   7900, 'usd', true,  70, '{"verified_included":true}'::jsonb),
  ('card-replacement', 'Replacement Card', 'Lost your card? Re-order paired to the same profile.',                            'PVC · Gold foil',           'Ships in 3–5 days',  null,                  1500, 'usd', true,  80, '{"verified_included":false}'::jsonb),
  ('verified-badge',   'Verified Badge',   'One-time upgrade. Required for custom art, apex domain, and non-HTTPS webhooks.', 'Digital',                   'Instant',            null,                   500, 'usd', true,  90, '{"digital":true}'::jsonb)
on conflict (sku) do update set
  name        = excluded.name,
  blurb       = excluded.blurb,
  finish      = excluded.finish,
  ships       = excluded.ships,
  badge       = excluded.badge,
  position    = excluded.position,
  metadata    = excluded.metadata,
  description = coalesce(public.vcard_products.description, excluded.blurb);

-- ---------------------------------------------------------------------------
-- Seed plans (idempotent — preserves stripe_price ids if already set)
-- ---------------------------------------------------------------------------
insert into public.vcard_plans (id, name, blurb, monthly_cents, yearly_cents, features, position)
values
  ('pro',  'Pro',  'For creators who need a domain, brand kit, and forms.',  499, 4990,
   '["Custom domain","Brand removal","Multi-profile (10)","2-way exchange","Lead forms","API + webhooks","Custom font","Password protect","Scheduled publish","A/B variants","CSV export","Weekly digest","50 GB storage"]'::jsonb,
   10),
  ('team', 'Team', 'For studios and crews. Pro plus 10 seats and brand kit.', 1499, 14990,
   '["Everything in Pro","10 seats","Brand kit","Pooled 250 GB storage","Shared profiles","Team analytics"]'::jsonb,
   20)
on conflict (id) do update set
  name           = excluded.name,
  blurb          = excluded.blurb,
  monthly_cents  = excluded.monthly_cents,
  yearly_cents   = excluded.yearly_cents,
  features       = excluded.features,
  position       = excluded.position,
  updated_at     = now();

-- ---------------------------------------------------------------------------
-- Default settings rows
-- ---------------------------------------------------------------------------
insert into public.vcard_settings (key, value) values
  ('shop.shipping_countries',  '["US","CA","GB","AU"]'::jsonb),
  ('flags.signup_enabled',     'true'::jsonb),
  ('flags.shop_enabled',       'true'::jsonb),
  ('flags.referrals_enabled',  'true'::jsonb),
  ('hero.banner',              '{"text":null,"href":null}'::jsonb)
on conflict (key) do nothing;
