-- 0009 vcard_teams + members + invites

create table if not exists public.vcard_teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        citext unique not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  brand_kit   jsonb default '{}'::jsonb,
  created_at  timestamptz not null default now()
);

create table if not exists public.vcard_team_members (
  team_id   uuid not null references public.vcard_teams(id) on delete cascade,
  user_id   uuid not null references auth.users(id) on delete cascade,
  role      text not null default 'member',                  -- owner|admin|member
  created_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create table if not exists public.vcard_team_invites (
  id        uuid primary key default gen_random_uuid(),
  team_id   uuid not null references public.vcard_teams(id) on delete cascade,
  email     text not null,
  role      text not null default 'member',
  token     text unique not null,
  expires_at timestamptz not null default (now() + interval '7 days'),
  accepted_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.vcard_teams enable row level security;
alter table public.vcard_team_members enable row level security;

drop policy if exists vcard_teams_member_read on public.vcard_teams;
create policy vcard_teams_member_read on public.vcard_teams
  for select to authenticated using (
    exists (select 1 from public.vcard_team_members m where m.team_id = id and m.user_id = auth.uid())
    or owner_id = auth.uid()
  );

drop policy if exists vcard_team_members_member_read on public.vcard_team_members;
create policy vcard_team_members_member_read on public.vcard_team_members
  for select to authenticated using (
    user_id = auth.uid()
    or exists (select 1 from public.vcard_team_members m2 where m2.team_id = team_id and m2.user_id = auth.uid())
  );
