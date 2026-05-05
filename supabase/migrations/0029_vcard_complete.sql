-- 0029 vcard_complete — fills remaining feature tables called out in BUILD_PLAN.
-- Covers: flags, carts, lead forms + submissions, brand kit, user fonts,
-- A/B variants, NFC JTI replay-protection, admin notes, email outbox,
-- soft-delete tombstone columns, and helpers.
-- Idempotent.

-- =============================================================================
-- 1. Feature flags / kill-switches  (BUILD_PLAN §12, §3)
-- =============================================================================
create table if not exists public.vcard_flags (
  key         text primary key,
  enabled     boolean not null default false,
  rollout_pct smallint not null default 0 check (rollout_pct between 0 and 100),
  payload     jsonb not null default '{}'::jsonb,
  description text,
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

drop trigger if exists vcard_flags_updated on public.vcard_flags;
create trigger vcard_flags_updated before update on public.vcard_flags
  for each row execute function public.set_updated_at();

alter table public.vcard_flags enable row level security;

drop policy if exists vcard_flags_public_read on public.vcard_flags;
create policy vcard_flags_public_read on public.vcard_flags
  for select to anon, authenticated using (true);

drop policy if exists vcard_flags_admin_write on public.vcard_flags;
create policy vcard_flags_admin_write on public.vcard_flags
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- =============================================================================
-- 2. Cart sync (cross-device, optional — anon carts live in localStorage only)
--    BUILD_PLAN §10
-- =============================================================================
create table if not exists public.vcard_carts (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  items      jsonb not null default '[]'::jsonb,        -- [{sku, qty, variant_id, price_cents}]
  currency   text not null default 'usd',
  updated_at timestamptz not null default now()
);

drop trigger if exists vcard_carts_updated on public.vcard_carts;
create trigger vcard_carts_updated before update on public.vcard_carts
  for each row execute function public.set_updated_at();

alter table public.vcard_carts enable row level security;

drop policy if exists vcard_carts_owner_rw on public.vcard_carts;
create policy vcard_carts_owner_rw on public.vcard_carts
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =============================================================================
-- 3. Lead forms + submissions (Pro lead capture, BUILD_PLAN §1, §11.1 'form')
-- =============================================================================
create table if not exists public.vcard_lead_forms (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  profile_id   uuid references public.vcard_profile_ext(user_id) on delete cascade,
  name         text not null,
  fields       jsonb not null default '[]'::jsonb,        -- [{name,label,type,required,options}]
  destination_email text,                                  -- override; defaults to profile owner email
  webhook_url  text,
  redirect_url text,
  enabled      boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists vcard_lead_forms_owner_idx on public.vcard_lead_forms (owner_id);

drop trigger if exists vcard_lead_forms_updated on public.vcard_lead_forms;
create trigger vcard_lead_forms_updated before update on public.vcard_lead_forms
  for each row execute function public.set_updated_at();

alter table public.vcard_lead_forms enable row level security;

drop policy if exists vcard_lead_forms_owner_rw on public.vcard_lead_forms;
create policy vcard_lead_forms_owner_rw on public.vcard_lead_forms
  for all to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

drop policy if exists vcard_lead_forms_public_read on public.vcard_lead_forms;
create policy vcard_lead_forms_public_read on public.vcard_lead_forms
  for select to anon, authenticated using (enabled = true);

create table if not exists public.vcard_form_submissions (
  id          uuid primary key default gen_random_uuid(),
  form_id     uuid not null references public.vcard_lead_forms(id) on delete cascade,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  payload     jsonb not null default '{}'::jsonb,         -- field -> value (sanitized)
  email       text,
  phone       text,
  ip_hash     text,                                        -- daily-rotating salt
  ua          text,
  source      text,                                        -- profile|exchange|embed|api
  status      text not null default 'new' check (status in ('new','read','archived','spam')),
  created_at  timestamptz not null default now()
);
create index if not exists vcard_form_submissions_owner_idx
  on public.vcard_form_submissions (owner_id, created_at desc);
create index if not exists vcard_form_submissions_form_idx
  on public.vcard_form_submissions (form_id, created_at desc);

alter table public.vcard_form_submissions enable row level security;

drop policy if exists vcard_form_submissions_owner_read on public.vcard_form_submissions;
create policy vcard_form_submissions_owner_read on public.vcard_form_submissions
  for select to authenticated using (auth.uid() = owner_id);

drop policy if exists vcard_form_submissions_owner_update on public.vcard_form_submissions;
create policy vcard_form_submissions_owner_update on public.vcard_form_submissions
  for update to authenticated
  using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Inserts go through service-role (rate-limit + Turnstile validated server-side).

-- =============================================================================
-- 4. Brand kit (Team feature)
-- =============================================================================
create table if not exists public.vcard_brand_kits (
  team_id     uuid primary key references public.vcard_teams(id) on delete cascade,
  logo_url    text,
  logo_dark_url text,
  colors      jsonb not null default '{}'::jsonb,         -- {primary,secondary,accent,...}
  fonts       jsonb not null default '{}'::jsonb,         -- {display,body}
  assets      jsonb not null default '[]'::jsonb,         -- additional brand assets
  updated_by  uuid references auth.users(id) on delete set null,
  updated_at  timestamptz not null default now()
);

drop trigger if exists vcard_brand_kits_updated on public.vcard_brand_kits;
create trigger vcard_brand_kits_updated before update on public.vcard_brand_kits
  for each row execute function public.set_updated_at();

alter table public.vcard_brand_kits enable row level security;

drop policy if exists vcard_brand_kits_team_read on public.vcard_brand_kits;
create policy vcard_brand_kits_team_read on public.vcard_brand_kits
  for select to authenticated
  using (
    exists (
      select 1 from public.vcard_team_members m
      where m.team_id = vcard_brand_kits.team_id and m.user_id = auth.uid()
    )
  );

drop policy if exists vcard_brand_kits_team_write on public.vcard_brand_kits;
create policy vcard_brand_kits_team_write on public.vcard_brand_kits
  for all to authenticated
  using (
    exists (
      select 1 from public.vcard_team_members m
      where m.team_id = vcard_brand_kits.team_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  )
  with check (
    exists (
      select 1 from public.vcard_team_members m
      where m.team_id = vcard_brand_kits.team_id
        and m.user_id = auth.uid()
        and m.role in ('owner','admin')
    )
  );

-- =============================================================================
-- 5. User-uploaded custom fonts (Pro)
-- =============================================================================
create table if not exists public.vcard_user_fonts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  family      text not null,
  weight      smallint not null default 400,
  style       text not null default 'normal' check (style in ('normal','italic')),
  url         text not null,                              -- vcard-fonts bucket
  bytes       bigint not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists vcard_user_fonts_user_idx on public.vcard_user_fonts (user_id);

alter table public.vcard_user_fonts enable row level security;

drop policy if exists vcard_user_fonts_owner_rw on public.vcard_user_fonts;
create policy vcard_user_fonts_owner_rw on public.vcard_user_fonts
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Public read so /u/<username> can resolve <link rel="preload"> for the font.
drop policy if exists vcard_user_fonts_public_read on public.vcard_user_fonts;
create policy vcard_user_fonts_public_read on public.vcard_user_fonts
  for select to anon, authenticated using (true);

-- =============================================================================
-- 6. A/B variants + scheduled publish (Pro)  BUILD_PLAN §1
-- =============================================================================
create table if not exists public.vcard_ab_variants (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  name        text not null,
  sections    jsonb not null default '[]'::jsonb,
  theme       jsonb not null default '{}'::jsonb,
  weight      smallint not null default 50 check (weight between 0 and 100),
  enabled     boolean not null default false,
  starts_at   timestamptz,
  ends_at     timestamptz,
  views       bigint not null default 0,
  conversions bigint not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists vcard_ab_variants_user_idx
  on public.vcard_ab_variants (user_id, enabled);

drop trigger if exists vcard_ab_variants_updated on public.vcard_ab_variants;
create trigger vcard_ab_variants_updated before update on public.vcard_ab_variants
  for each row execute function public.set_updated_at();

alter table public.vcard_ab_variants enable row level security;

drop policy if exists vcard_ab_variants_owner_rw on public.vcard_ab_variants;
create policy vcard_ab_variants_owner_rw on public.vcard_ab_variants
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists vcard_ab_variants_public_read on public.vcard_ab_variants;
create policy vcard_ab_variants_public_read on public.vcard_ab_variants
  for select to anon, authenticated
  using (enabled = true);

-- =============================================================================
-- 7. NFC pair-token replay protection (BUILD_PLAN §23)
-- =============================================================================
create table if not exists public.vcard_nfc_jti (
  jti         text primary key,
  card_id     uuid references public.vcard_cards(id) on delete cascade,
  used_at     timestamptz not null default now(),
  ip_hash     text
);
create index if not exists vcard_nfc_jti_card_idx on public.vcard_nfc_jti (card_id, used_at desc);

alter table public.vcard_nfc_jti enable row level security;
-- Service-role only; no policies.

-- =============================================================================
-- 8. Admin notes (moderation memos pinned to a user/order/card)
-- =============================================================================
create table if not exists public.vcard_admin_notes (
  id          bigserial primary key,
  target_kind text not null,
  target_id   text not null,
  body        text not null,
  pinned      boolean not null default false,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists vcard_admin_notes_target_idx
  on public.vcard_admin_notes (target_kind, target_id, created_at desc);

alter table public.vcard_admin_notes enable row level security;

drop policy if exists vcard_admin_notes_admin_rw on public.vcard_admin_notes;
create policy vcard_admin_notes_admin_rw on public.vcard_admin_notes
  for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

-- =============================================================================
-- 9. Email outbox (Resend reliability + idempotency)
-- =============================================================================
create table if not exists public.vcard_email_outbox (
  id          uuid primary key default gen_random_uuid(),
  idem_key    text unique,                                 -- dedupe key
  to_email    text not null,
  template    text not null,
  payload     jsonb not null default '{}'::jsonb,
  status      text not null default 'queued' check (status in ('queued','sent','failed','cancelled')),
  attempts    smallint not null default 0,
  last_error  text,
  resend_id   text,
  created_at  timestamptz not null default now(),
  sent_at     timestamptz
);
create index if not exists vcard_email_outbox_status_idx
  on public.vcard_email_outbox (status, created_at) where status = 'queued';

alter table public.vcard_email_outbox enable row level security;
-- Service-role only.

-- =============================================================================
-- 10. Soft-delete tombstone columns on profile_ext (DSR 30-day grace window).
-- =============================================================================
alter table public.vcard_profile_ext
  add column if not exists deleted_at timestamptz,
  add column if not exists hard_delete_at timestamptz;

create index if not exists vcard_profile_ext_hard_delete_idx
  on public.vcard_profile_ext (hard_delete_at)
  where hard_delete_at is not null;

-- Public renderer must hide soft-deleted profiles.
drop policy if exists vcard_profile_ext_public_read on public.vcard_profile_ext;
create policy vcard_profile_ext_public_read on public.vcard_profile_ext
  for select to anon, authenticated
  using (published = true and deleted_at is null);

-- =============================================================================
-- 11. Helper: hard-delete worker (runs from pg_cron in 0031).
-- =============================================================================
create or replace function public.vcard_dsr_hard_delete()
returns integer language plpgsql security definer set search_path = public, auth as $$
declare
  rows_deleted integer := 0;
  victim record;
begin
  for victim in
    select user_id from public.vcard_profile_ext
    where hard_delete_at is not null
      and hard_delete_at <= now()
    limit 50
  loop
    -- cascading deletes via FK on auth.users handle most child tables.
    delete from auth.users where id = victim.user_id;
    update public.vcard_dsr_log
       set status = 'completed', completed_at = now()
     where user_id = victim.user_id and kind = 'delete' and status <> 'completed';
    rows_deleted := rows_deleted + 1;
  end loop;
  return rows_deleted;
end $$;

revoke all on function public.vcard_dsr_hard_delete() from public, anon, authenticated;
