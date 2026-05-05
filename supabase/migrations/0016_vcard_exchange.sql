-- 0016 vcard_exchange_tokens — 2-way contact exchange (Pro)

create table if not exists public.vcard_exchange_tokens (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  token       text unique not null,
  expires_at  timestamptz not null default (now() + interval '15 minutes'),
  consumed_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists vcard_exchange_user_idx on public.vcard_exchange_tokens (user_id);

create table if not exists public.vcard_contacts (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references auth.users(id) on delete cascade,
  source        text not null,                              -- form|exchange|manual|import
  name          text,
  email         text,
  phone         text,
  company       text,
  note          text,
  raw           jsonb,
  captured_at   timestamptz not null default now()
);
create index if not exists vcard_contacts_owner_idx on public.vcard_contacts (owner_id);

alter table public.vcard_exchange_tokens enable row level security;
alter table public.vcard_contacts enable row level security;
drop policy if exists vcard_exchange_owner_rw on public.vcard_exchange_tokens;
create policy vcard_exchange_owner_rw on public.vcard_exchange_tokens
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists vcard_contacts_owner_rw on public.vcard_contacts;
create policy vcard_contacts_owner_rw on public.vcard_contacts
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
