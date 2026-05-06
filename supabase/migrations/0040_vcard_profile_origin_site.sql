-- 0040 vcard_profile_origin_site
-- Track the canonical site host that provisioned the VoidCard-owned profile row.

alter table if exists public.vcard_profile_ext
  add column if not exists origin_site text;

update public.vcard_profile_ext
set origin_site = 'vcard.ed5enterprise.com'
where coalesce(btrim(origin_site), '') = '';

alter table if exists public.vcard_profile_ext
  alter column origin_site set default 'vcard.ed5enterprise.com';

alter table if exists public.vcard_profile_ext
  alter column origin_site set not null;

create index if not exists vcard_profile_ext_origin_site_idx
  on public.vcard_profile_ext (origin_site);