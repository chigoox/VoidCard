-- 0027_vcard_seo_ai.sql
-- Adds SEO + AI crawler controls to public profiles, plus a redirect table
-- and a sampled crawler log. Idempotent.

alter table if exists vcard_profile_ext
  add column if not exists is_indexable boolean not null default true,
  add column if not exists ai_indexing text not null default 'allow_search_only',
  add column if not exists canonical_host text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vcard_profile_ext_ai_indexing_check'
  ) then
    alter table vcard_profile_ext
      add constraint vcard_profile_ext_ai_indexing_check
      check (ai_indexing in ('allow_search_only','allow_all','disallow_all'));
  end if;
end$$;

create table if not exists vcard_seo_redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  status int not null default 308 check (status in (301,302,307,308,410)),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists vcard_crawl_log (
  ts timestamptz not null default now(),
  bot text not null,
  path text not null,
  status int not null,
  ms int not null
);

create index if not exists vcard_crawl_log_ts_idx
  on vcard_crawl_log (ts desc);

-- RLS: redirects are admin-managed; crawl log is service-role only.
alter table vcard_seo_redirects enable row level security;
alter table vcard_crawl_log enable row level security;

drop policy if exists vcard_seo_redirects_admin_all on vcard_seo_redirects;
create policy vcard_seo_redirects_admin_all on vcard_seo_redirects
  for all to authenticated
  using (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1 from profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
