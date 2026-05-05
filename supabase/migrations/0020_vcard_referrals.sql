-- 0020 vcard_referrals + store credits

create table if not exists public.vcard_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referee_id  uuid references auth.users(id) on delete set null,
  code        text unique not null,
  channel     text,
  status      text not null default 'visited',          -- visited|signed_up|converted
  reward_cents int not null default 0,
  rewarded_at timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists vcard_referrals_referrer_idx on public.vcard_referrals (referrer_id);

create table if not exists public.vcard_store_credits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  delta_cents int not null,
  reason text not null,                                  -- referral|refund|promo|adjustment
  ref_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists vcard_store_credits_user_idx on public.vcard_store_credits (user_id);

alter table public.vcard_referrals enable row level security;
alter table public.vcard_store_credits enable row level security;
drop policy if exists vcard_referrals_owner_rw on public.vcard_referrals;
create policy vcard_referrals_owner_rw on public.vcard_referrals
  for all to authenticated using (auth.uid() = referrer_id) with check (auth.uid() = referrer_id);
drop policy if exists vcard_credits_owner_read on public.vcard_store_credits;
create policy vcard_credits_owner_read on public.vcard_store_credits
  for select to authenticated using (auth.uid() = user_id);
