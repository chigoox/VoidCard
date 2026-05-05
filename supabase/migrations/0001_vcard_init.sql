-- 0001 vcard_init: profile_ext + helpers
-- shared profiles table (id, role) is owned by the ED5 ecosystem; do not modify.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create table if not exists public.vcard_profile_ext (
  user_id              uuid primary key references auth.users(id) on delete cascade,
  username             citext unique,                            -- @handle
  display_name         text,
  bio                  text,
  avatar_url           text,
  cover_url            text,
  theme                jsonb not null default '{"id":"onyx-gold"}'::jsonb,
  custom_css           text,
  custom_font_url      text,                                     -- pro
  sections             jsonb not null default '[]'::jsonb,       -- published
  sections_draft       jsonb not null default '[]'::jsonb,
  published            boolean not null default false,
  password_hash        text,                                     -- pro: page password
  scheduled_publish_at timestamptz,                              -- pro
  verified             boolean not null default false,
  plan                 text not null default 'free',             -- free|pro|team|enterprise
  bonus_storage_bytes  bigint not null default 0,                -- earned via card purchases
  onboarding_state     jsonb not null default '{"step":0}'::jsonb,
  remove_branding      boolean not null default false,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);
create extension if not exists citext;
create index if not exists vcard_profile_ext_published_idx
  on public.vcard_profile_ext (published) where published = true;

drop trigger if exists vcard_profile_ext_updated on public.vcard_profile_ext;
create trigger vcard_profile_ext_updated before update on public.vcard_profile_ext
  for each row execute function public.set_updated_at();

-- RLS
alter table public.vcard_profile_ext enable row level security;

drop policy if exists vcard_profile_ext_owner_rw on public.vcard_profile_ext;
create policy vcard_profile_ext_owner_rw on public.vcard_profile_ext
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists vcard_profile_ext_public_read on public.vcard_profile_ext;
create policy vcard_profile_ext_public_read on public.vcard_profile_ext
  for select to anon, authenticated
  using (published = true);
