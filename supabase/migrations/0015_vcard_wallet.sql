-- 0015 vcard_wallet_passes

create table if not exists public.vcard_wallet_passes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null,                                  -- apple|google
  serial      text unique not null,
  pass_url    text,
  registered  boolean not null default false,
  push_token  text,
  device_id   text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
alter table public.vcard_wallet_passes enable row level security;
drop policy if exists vcard_wallet_owner_rw on public.vcard_wallet_passes;
create policy vcard_wallet_owner_rw on public.vcard_wallet_passes
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
