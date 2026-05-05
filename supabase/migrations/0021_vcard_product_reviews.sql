-- 0021 vcard_product_reviews

create table if not exists public.vcard_product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.vcard_products(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  order_id   uuid references public.vcard_orders(id),
  rating     int not null check (rating between 1 and 5),
  title      text,
  body       text,
  approved   boolean not null default false,
  created_at timestamptz not null default now(),
  unique (product_id, user_id)
);
create index if not exists vcard_reviews_product_idx on public.vcard_product_reviews (product_id, approved);

alter table public.vcard_product_reviews enable row level security;
drop policy if exists vcard_reviews_public_read on public.vcard_product_reviews;
create policy vcard_reviews_public_read on public.vcard_product_reviews
  for select to anon, authenticated using (approved = true);
drop policy if exists vcard_reviews_owner_rw on public.vcard_product_reviews;
create policy vcard_reviews_owner_rw on public.vcard_product_reviews
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
