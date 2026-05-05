-- 0035 vcard_wallet_updates — Apple web service registrations + Google object sync identifiers

alter table public.vcard_wallet_passes
  add column if not exists auth_token text;

alter table public.vcard_wallet_passes
  add column if not exists wallet_object_id text;

alter table public.vcard_wallet_passes
  add column if not exists wallet_class_id text;

alter table public.vcard_wallet_passes
  add column if not exists last_synced_at timestamptz;

create table if not exists public.vcard_wallet_registrations (
  id          uuid primary key default gen_random_uuid(),
  pass_id      uuid not null references public.vcard_wallet_passes(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  device_id    text not null,
  push_token   text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create unique index if not exists vcard_wallet_registrations_pass_device_uq
  on public.vcard_wallet_registrations (pass_id, device_id);

create index if not exists vcard_wallet_registrations_device_idx
  on public.vcard_wallet_registrations (device_id, updated_at desc);

drop trigger if exists vcard_wallet_registrations_updated on public.vcard_wallet_registrations;
create trigger vcard_wallet_registrations_updated
  before update on public.vcard_wallet_registrations
  for each row execute function public.set_updated_at();

alter table public.vcard_wallet_registrations enable row level security;

drop policy if exists vcard_wallet_registrations_owner_rw on public.vcard_wallet_registrations;
create policy vcard_wallet_registrations_owner_rw on public.vcard_wallet_registrations
  for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);