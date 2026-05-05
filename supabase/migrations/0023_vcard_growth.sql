-- 0023 vcard_achievements + 0024 prompts_shown + 0025 churn_survey + 0026 funnel_events
-- combined for clarity, run order preserved in filename.

create table if not exists public.vcard_achievements (
  user_id    uuid not null references auth.users(id) on delete cascade,
  code       text not null,
  awarded_at timestamptz not null default now(),
  primary key (user_id, code)
);

create table if not exists public.vcard_prompts_shown (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind    text not null,
  shown_at timestamptz not null default now()
);
create index if not exists vcard_prompts_user_kind_idx on public.vcard_prompts_shown (user_id, kind, shown_at desc);

create table if not exists public.vcard_churn_survey (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reason  text not null,
  note    text,
  created_at timestamptz not null default now()
);

create table if not exists public.vcard_funnel_events (
  id          bigserial primary key,
  user_id     uuid references auth.users(id) on delete set null,
  anon_id     text,
  event       text not null,
  props       jsonb default '{}'::jsonb,
  occurred_at timestamptz not null default now()
);
create index if not exists vcard_funnel_user_idx on public.vcard_funnel_events (user_id, occurred_at desc);
create index if not exists vcard_funnel_event_idx on public.vcard_funnel_events (event, occurred_at desc);

alter table public.vcard_achievements enable row level security;
alter table public.vcard_prompts_shown enable row level security;
alter table public.vcard_churn_survey enable row level security;
alter table public.vcard_funnel_events enable row level security;
drop policy if exists vcard_ach_owner_read on public.vcard_achievements;
create policy vcard_ach_owner_read on public.vcard_achievements
  for select to authenticated using (auth.uid() = user_id);
drop policy if exists vcard_prompts_owner_read on public.vcard_prompts_shown;
create policy vcard_prompts_owner_read on public.vcard_prompts_shown
  for select to authenticated using (auth.uid() = user_id);
