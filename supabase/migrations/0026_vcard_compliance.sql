-- 0026 vcard_compliance — audit log, DSR jobs, cookie consent, Stripe event idempotency.
-- Aligns with BUILD_PLAN.md §15 (Security) and §29 (GDPR/CCPA).

-- =============================================================================
-- vcard_audit_log: every privileged / admin action.
-- =============================================================================
create table if not exists public.vcard_audit_log (
  id          bigserial primary key,
  actor_id    uuid references auth.users(id) on delete set null,
  actor_role  text,                                -- snapshot at time of action
  action      text not null,                       -- e.g. 'admin.role.update', 'verification.revoke'
  target_kind text,                                -- e.g. 'user', 'vcard_profile', 'vcard_verifications'
  target_id   text,                                -- string for flexibility (uuid, slug, etc.)
  diff        jsonb,                               -- {before, after} or arbitrary metadata
  ip_hash     text,                                -- daily-rotating salt
  ua          text,
  created_at  timestamptz not null default now()
);

create index if not exists vcard_audit_log_actor_idx
  on public.vcard_audit_log (actor_id, created_at desc);
create index if not exists vcard_audit_log_target_idx
  on public.vcard_audit_log (target_kind, target_id, created_at desc);
create index if not exists vcard_audit_log_action_idx
  on public.vcard_audit_log (action, created_at desc);

alter table public.vcard_audit_log enable row level security;

-- Admins can read the full log; regular users see only entries about themselves.
drop policy if exists vcard_audit_log_admin_read on public.vcard_audit_log;
create policy vcard_audit_log_admin_read on public.vcard_audit_log
  for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists vcard_audit_log_self_read on public.vcard_audit_log;
create policy vcard_audit_log_self_read on public.vcard_audit_log
  for select to authenticated
  using (target_kind = 'user' and target_id = auth.uid()::text);

-- Writes are server-side only (service-role / SECURITY DEFINER helper); no INSERT policy for users.

-- =============================================================================
-- vcard_dsr_log: GDPR / CCPA data-subject-request jobs.
-- =============================================================================
create table if not exists public.vcard_dsr_log (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('export','delete')),
  status        text not null default 'queued' check (status in ('queued','processing','ready','failed','cancelled','completed')),
  url           text,                              -- signed URL for export ZIP
  url_expires_at timestamptz,
  delete_at     timestamptz,                       -- for kind='delete', the scheduled hard-delete time
  cancelled_at  timestamptz,
  error         text,
  created_at    timestamptz not null default now(),
  completed_at  timestamptz
);

create index if not exists vcard_dsr_log_user_idx on public.vcard_dsr_log (user_id, created_at desc);
create index if not exists vcard_dsr_log_status_idx on public.vcard_dsr_log (status) where status in ('queued','processing');

alter table public.vcard_dsr_log enable row level security;

drop policy if exists vcard_dsr_log_owner_read on public.vcard_dsr_log;
create policy vcard_dsr_log_owner_read on public.vcard_dsr_log
  for select to authenticated using (auth.uid() = user_id);

-- Inserts/updates/deletes performed by service-role from server actions / Edge Functions only.

-- =============================================================================
-- vcard_consent_log: cookie / processing consent (cookie banner).
-- =============================================================================
create table if not exists public.vcard_consent_log (
  id          bigserial primary key,
  cookie_id   text,                                -- anonymous identifier when not signed in
  user_id     uuid references auth.users(id) on delete set null,
  choice      jsonb not null,                      -- {essential:true, analytics:bool, marketing:bool}
  policy_version text not null,                    -- e.g. '2026-05-01'
  ip_hash     text,
  ua          text,
  created_at  timestamptz not null default now()
);

create index if not exists vcard_consent_log_user_idx on public.vcard_consent_log (user_id, created_at desc);
create index if not exists vcard_consent_log_cookie_idx on public.vcard_consent_log (cookie_id, created_at desc);

alter table public.vcard_consent_log enable row level security;

drop policy if exists vcard_consent_log_self_read on public.vcard_consent_log;
create policy vcard_consent_log_self_read on public.vcard_consent_log
  for select to authenticated using (auth.uid() = user_id);

-- =============================================================================
-- vcard_stripe_events: idempotency + replay protection for Stripe webhooks.
-- =============================================================================
create table if not exists public.vcard_stripe_events (
  id            text primary key,                  -- Stripe event.id (evt_...)
  type          text not null,
  livemode      boolean not null default false,
  payload       jsonb,
  received_at   timestamptz not null default now(),
  processed_at  timestamptz,
  error         text
);

create index if not exists vcard_stripe_events_type_idx
  on public.vcard_stripe_events (type, received_at desc);

alter table public.vcard_stripe_events enable row level security;
-- No policies: service-role only.

-- =============================================================================
-- vcard_csp_reports: optional retention of CSP violation reports for triage.
-- =============================================================================
create table if not exists public.vcard_csp_reports (
  id            bigserial primary key,
  document_uri  text,
  violated_directive text,
  effective_directive text,
  blocked_uri   text,
  source_file   text,
  line_number   integer,
  status_code   integer,
  user_agent    text,
  ip_hash       text,
  raw           jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists vcard_csp_reports_directive_idx
  on public.vcard_csp_reports (violated_directive, created_at desc);

alter table public.vcard_csp_reports enable row level security;
-- Admin-read only.
drop policy if exists vcard_csp_reports_admin_read on public.vcard_csp_reports;
create policy vcard_csp_reports_admin_read on public.vcard_csp_reports
  for select to authenticated
  using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
