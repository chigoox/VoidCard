-- 0032 vcard_custom_domains_public_read
-- Allow middleware (anon SSR) to resolve active custom domains to a username
-- without using service-role from the edge.

drop policy if exists vcard_domains_public_active_read on public.vcard_custom_domains;
create policy vcard_domains_public_active_read on public.vcard_custom_domains
  for select to anon, authenticated
  using (status = 'active');

-- View that joins active domains to their owner's username for fast lookup.
create or replace view public.vcard_active_domains as
  select d.hostname, p.username
  from public.vcard_custom_domains d
  join public.vcard_profile_ext p on p.user_id = d.user_id
  where d.status = 'active'
    and p.published = true
    and p.deleted_at is null;

grant select on public.vcard_active_domains to anon, authenticated;
