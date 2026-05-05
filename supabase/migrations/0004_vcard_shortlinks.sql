-- 0004 vcard_shortlinks: vc.ed5e.co/<code> → target

create table if not exists public.vcard_shortlinks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  code        text unique not null,
  target      text not null,
  utm         jsonb,
  hits        bigint not null default 0,
  expires_at  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists vcard_shortlinks_user_idx on public.vcard_shortlinks (user_id);

alter table public.vcard_shortlinks enable row level security;
drop policy if exists vcard_shortlinks_owner_rw on public.vcard_shortlinks;
create policy vcard_shortlinks_owner_rw on public.vcard_shortlinks
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists vcard_shortlinks_public_read on public.vcard_shortlinks;
create policy vcard_shortlinks_public_read on public.vcard_shortlinks
  for select to anon, authenticated using (true);
