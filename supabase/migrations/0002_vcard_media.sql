-- 0002 vcard_media: user uploads (images/video/files)

create table if not exists public.vcard_media (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  bucket       text not null default 'vcard-media',
  storage_path text not null,
  kind         text not null,                                  -- image|video|file
  mime         text,
  size_bytes   bigint not null,
  width        int,
  height       int,
  duration_ms  int,
  created_at   timestamptz not null default now()
);
create index if not exists vcard_media_user_idx on public.vcard_media (user_id);

alter table public.vcard_media enable row level security;
drop policy if exists vcard_media_owner_rw on public.vcard_media;
create policy vcard_media_owner_rw on public.vcard_media
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
