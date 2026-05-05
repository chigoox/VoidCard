-- 0031 vcard_cron — scheduled background jobs via pg_cron.
-- Idempotent.  All schedules are no-ops if pg_cron is not available.
-- Aligns with BUILD_PLAN.md §15 (security retention) + §29 (GDPR).

create extension if not exists pg_cron;

-- Helper: silently unschedule a job by name if it exists.
create or replace function public.vcard_unschedule(job_name text)
returns void language plpgsql as $$
begin
  if exists (select 1 from cron.job where jobname = job_name) then
    perform cron.unschedule(job_name);
  end if;
end $$;

-- =============================================================================
-- 1. DSR hard-delete sweep — runs hourly.
-- =============================================================================
select public.vcard_unschedule('vcard_dsr_hard_delete');
select cron.schedule(
  'vcard_dsr_hard_delete',
  '7 * * * *',
  $$ select public.vcard_dsr_hard_delete(); $$
);

-- =============================================================================
-- 2. Tap retention — keep 400 days of raw tap rows. Older ones drop.
-- =============================================================================
select public.vcard_unschedule('vcard_taps_prune');
select cron.schedule(
  'vcard_taps_prune',
  '15 3 * * *',
  $$ delete from public.vcard_taps where occurred_at < now() - interval '400 days'; $$
);

-- =============================================================================
-- 3. Audit-log retention — 2 years.
-- =============================================================================
select public.vcard_unschedule('vcard_audit_prune');
select cron.schedule(
  'vcard_audit_prune',
  '30 3 * * *',
  $$ delete from public.vcard_audit_log where created_at < now() - interval '2 years'; $$
);

-- =============================================================================
-- 4. CSP-report retention — 30 days (high churn, low value after triage).
-- =============================================================================
select public.vcard_unschedule('vcard_csp_prune');
select cron.schedule(
  'vcard_csp_prune',
  '45 3 * * *',
  $$ delete from public.vcard_csp_reports where created_at < now() - interval '30 days'; $$
);

-- =============================================================================
-- 5. Stripe-event retention — 90 days (idempotency window).
-- =============================================================================
select public.vcard_unschedule('vcard_stripe_events_prune');
select cron.schedule(
  'vcard_stripe_events_prune',
  '0 4 * * *',
  $$ delete from public.vcard_stripe_events where received_at < now() - interval '90 days'; $$
);

-- =============================================================================
-- 6. NFC-JTI retention — 60 days then drop (tokens already used).
-- =============================================================================
select public.vcard_unschedule('vcard_nfc_jti_prune');
select cron.schedule(
  'vcard_nfc_jti_prune',
  '15 4 * * *',
  $$ delete from public.vcard_nfc_jti where used_at < now() - interval '60 days'; $$
);

-- =============================================================================
-- 7. Consent-log retention — 5 years (GDPR record-keeping).
-- =============================================================================
select public.vcard_unschedule('vcard_consent_prune');
select cron.schedule(
  'vcard_consent_prune',
  '30 4 * * *',
  $$ delete from public.vcard_consent_log where created_at < now() - interval '5 years'; $$
);

-- =============================================================================
-- 8. Crawl-log retention — 30 days.
-- =============================================================================
select public.vcard_unschedule('vcard_crawl_prune');
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'vcard_crawl_log'
  ) then
    perform cron.schedule(
      'vcard_crawl_prune',
      '45 4 * * *',
      'delete from public.vcard_crawl_log where created_at < now() - interval ''30 days'';'
    );
  end if;
end $$;

-- =============================================================================
-- 9. Daily DSR-export TTL sweep — expire signed URLs older than 7d.
-- =============================================================================
select public.vcard_unschedule('vcard_dsr_export_expire');
select cron.schedule(
  'vcard_dsr_export_expire',
  '0 5 * * *',
  $$ update public.vcard_dsr_log
        set status = 'failed', error = coalesce(error,'expired'), url = null
      where kind = 'export' and status = 'ready'
        and url_expires_at is not null and url_expires_at < now(); $$
);
