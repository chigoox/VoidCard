-- 0008 vcard_subscriptions

create table if not exists public.vcard_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  team_id         uuid,                                       -- references vcard_teams (later)
  stripe_customer_id     text not null,
  stripe_subscription_id text unique,
  plan            text not null,                              -- pro|team|enterprise
  interval        text not null,                              -- month|year
  status          text not null,                              -- trialing|active|past_due|canceled|incomplete
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  trial_end       timestamptz,
  seats           int not null default 1,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists vcard_subs_user_uq
  on public.vcard_subscriptions (user_id) where team_id is null;

alter table public.vcard_subscriptions enable row level security;
drop policy if exists vcard_subs_owner_read on public.vcard_subscriptions;
create policy vcard_subs_owner_read on public.vcard_subscriptions
  for select to authenticated using (auth.uid() = user_id);
