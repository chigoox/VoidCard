-- 0032 vcard_verification_statuses — align DB status rules with verification workflow

do $$
begin
  alter table public.vcard_verifications
    drop constraint if exists vcard_verifications_status_check;

  alter table public.vcard_verifications
    add constraint vcard_verifications_status_check
    check (status in ('pending', 'approved', 'needs_more_info', 'rejected', 'revoked'));
end
$$;

drop index if exists public.vcard_verifications_active_uq;
create unique index if not exists vcard_verifications_active_uq
  on public.vcard_verifications (user_id) where status in ('pending', 'approved', 'needs_more_info');

comment on column public.vcard_verifications.status is
  'pending|approved|needs_more_info|rejected|revoked';