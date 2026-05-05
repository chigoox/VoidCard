-- 0010 vcard_custom_domains

create table if not exists public.vcard_custom_domains (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  hostname     citext unique not null,
  apex         boolean not null default false,
  status       text not null default 'pending',              -- pending|verifying|active|failed|disabled
  txt_token    text not null,                                -- _voidcard-verify TXT
  ssl_status   text not null default 'pending',
  vercel_domain_id text,
  last_checked_at timestamptz,
  created_at   timestamptz not null default now()
);

alter table public.vcard_custom_domains enable row level security;
drop policy if exists vcard_domains_owner_rw on public.vcard_custom_domains;
create policy vcard_domains_owner_rw on public.vcard_custom_domains
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
