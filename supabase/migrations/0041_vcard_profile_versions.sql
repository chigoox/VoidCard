-- 0041 vcard_profile_versions
-- Snapshot history for editor versions / restore.

create table if not exists public.vcard_profile_versions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  -- profile_id may be the user id (primary profile) or a vcard_profile_ext.id (companion)
  profile_id uuid not null,
  label text,
  sections jsonb not null default '[]'::jsonb,
  theme jsonb,
  custom_css text,
  created_at timestamptz not null default now()
);

create index if not exists vcard_profile_versions_owner_profile_idx
  on public.vcard_profile_versions (owner_user_id, profile_id, created_at desc);

alter table public.vcard_profile_versions enable row level security;

create policy vcard_profile_versions_owner_read on public.vcard_profile_versions
  for select using (owner_user_id = auth.uid());

create policy vcard_profile_versions_owner_insert on public.vcard_profile_versions
  for insert with check (owner_user_id = auth.uid());

create policy vcard_profile_versions_owner_delete on public.vcard_profile_versions
  for delete using (owner_user_id = auth.uid());
