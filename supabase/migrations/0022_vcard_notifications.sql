-- 0022 vcard_notifications

create table if not exists public.vcard_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind    text not null,
  title   text not null,
  body    text,
  url     text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists vcard_notifications_user_idx on public.vcard_notifications (user_id, read_at);

alter table public.vcard_notifications enable row level security;
drop policy if exists vcard_notifications_owner_rw on public.vcard_notifications;
create policy vcard_notifications_owner_rw on public.vcard_notifications
  for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
