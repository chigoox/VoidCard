-- 0017 vcard_verifications — Verified Badge ($5 or earned)

create table if not exists public.vcard_verifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  method        text not null,                          -- individual|business|brand|earned|manual
  status        text not null default 'pending',        -- pending|approved|rejected|revoked
  documents     jsonb,                                  -- [{kind, storage_path}]
  paid          boolean not null default false,
  stripe_payment_intent text,
  reviewer_id   uuid,
  reviewer_note text,
  reason        text,
  submitted_at  timestamptz not null default now(),
  decided_at    timestamptz,
  expires_at    timestamptz
);
create unique index if not exists vcard_verifications_active_uq
  on public.vcard_verifications (user_id) where status in ('pending','approved');

alter table public.vcard_verifications enable row level security;
drop policy if exists vcard_verifications_owner_read on public.vcard_verifications;
create policy vcard_verifications_owner_read on public.vcard_verifications
  for select to authenticated using (auth.uid() = user_id);
