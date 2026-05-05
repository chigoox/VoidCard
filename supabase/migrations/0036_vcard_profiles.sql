-- 0036 vcard_profiles - additional user-owned public profiles for Pro and Team

create table if not exists public.vcard_profiles (
  id                   uuid primary key default gen_random_uuid(),
  owner_user_id        uuid not null references auth.users(id) on delete cascade,
  username             citext not null unique,
  display_name         text,
  bio                  text,
  avatar_url           text,
  theme                jsonb not null default '{"id":"onyx-gold"}'::jsonb,
  custom_css           text,
  custom_font_url      text,
  sections             jsonb not null default '[]'::jsonb,
  sections_draft       jsonb not null default '[]'::jsonb,
  links                jsonb not null default '[]'::jsonb,
  published            boolean not null default false,
  password_hash        text,
  scheduled_publish_at timestamptz,
  remove_branding      boolean not null default false,
  is_indexable         boolean not null default true,
  ai_indexing          text not null default 'allow_search_only',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

create index if not exists vcard_profiles_owner_idx
  on public.vcard_profiles (owner_user_id, created_at desc);

create index if not exists vcard_profiles_published_idx
  on public.vcard_profiles (published, updated_at desc)
  where published = true and deleted_at is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'vcard_profiles_ai_indexing_check'
  ) then
    alter table public.vcard_profiles
      add constraint vcard_profiles_ai_indexing_check
      check (ai_indexing in ('allow_search_only','allow_all','disallow_all'));
  end if;
end $$;

drop trigger if exists vcard_profiles_updated on public.vcard_profiles;
create trigger vcard_profiles_updated before update on public.vcard_profiles
  for each row execute function public.set_updated_at();

alter table public.vcard_profiles enable row level security;

drop policy if exists vcard_profiles_owner_rw on public.vcard_profiles;
create policy vcard_profiles_owner_rw on public.vcard_profiles
  for all to authenticated
  using (auth.uid() = owner_user_id)
  with check (auth.uid() = owner_user_id);

drop policy if exists vcard_profiles_public_read on public.vcard_profiles;
create policy vcard_profiles_public_read on public.vcard_profiles
  for select to anon, authenticated
  using (published = true and deleted_at is null);