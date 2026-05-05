-- 0014 vcard_api_keys + webhooks + deliveries

create table if not exists public.vcard_api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  prefix        text not null,
  hash          text not null,
  scopes        text[] not null default '{read}',
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz not null default now()
);

create table if not exists public.vcard_webhooks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  url         text not null,
  secret      text not null,
  events      text[] not null default '{tap.created,contact.captured,order.paid}',
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.vcard_webhook_deliveries (
  id           uuid primary key default gen_random_uuid(),
  webhook_id   uuid not null references public.vcard_webhooks(id) on delete cascade,
  event        text not null,
  payload      jsonb not null,
  status_code  int,
  response_ms  int,
  error        text,
  attempt      int not null default 1,
  delivered_at timestamptz default now()
);

alter table public.vcard_api_keys enable row level security;
alter table public.vcard_webhooks enable row level security;
alter table public.vcard_webhook_deliveries enable row level security;
drop policy if exists vcard_keys_owner_rw on public.vcard_api_keys;
create policy vcard_keys_owner_rw on public.vcard_api_keys
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists vcard_webhooks_owner_rw on public.vcard_webhooks;
create policy vcard_webhooks_owner_rw on public.vcard_webhooks
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
drop policy if exists vcard_webhook_deliveries_owner_read on public.vcard_webhook_deliveries;
create policy vcard_webhook_deliveries_owner_read on public.vcard_webhook_deliveries
  for select to authenticated using (
    exists (select 1 from public.vcard_webhooks w where w.id = webhook_id and w.user_id = auth.uid())
  );
