alter table public.vcard_profile_ext
  add column if not exists weekly_digest_enabled boolean not null default true,
  add column if not exists last_weekly_digest_at timestamptz;

create index if not exists vcard_profile_ext_weekly_digest_idx
  on public.vcard_profile_ext (weekly_digest_enabled, last_weekly_digest_at)
  where weekly_digest_enabled = true;