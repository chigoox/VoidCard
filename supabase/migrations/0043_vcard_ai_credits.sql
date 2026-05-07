-- 0043 vcard_ai_credits: per-user AI image-generation credit balance + ledger.
-- Credits are earned (free monthly grant, card purchase bonus, manual grant)
-- or purchased (credits pack SKU). Each AI generation debits one credit.

create table if not exists public.vcard_ai_credits (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  balance            int  not null default 0 check (balance >= 0),
  lifetime_granted   int  not null default 0,
  lifetime_spent     int  not null default 0,
  last_monthly_grant timestamptz,
  updated_at         timestamptz not null default now()
);

alter table public.vcard_ai_credits enable row level security;
drop policy if exists vcard_ai_credits_owner_read on public.vcard_ai_credits;
create policy vcard_ai_credits_owner_read on public.vcard_ai_credits
  for select to authenticated
  using (auth.uid() = user_id);
-- All writes go through the service role.

create table if not exists public.vcard_ai_credit_ledger (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  delta       int  not null,
  reason      text not null, -- 'monthly_grant' | 'card_bonus' | 'purchase' | 'admin' | 'spend' | 'refund'
  ref_id      text,
  metadata    jsonb,
  created_at  timestamptz not null default now()
);
create index if not exists vcard_ai_credit_ledger_user_idx
  on public.vcard_ai_credit_ledger (user_id, created_at desc);

alter table public.vcard_ai_credit_ledger enable row level security;
drop policy if exists vcard_ai_credit_ledger_owner_read on public.vcard_ai_credit_ledger;
create policy vcard_ai_credit_ledger_owner_read on public.vcard_ai_credit_ledger
  for select to authenticated
  using (auth.uid() = user_id);

-- Track AI-generated media so we can show source in the library modal.
alter table public.vcard_media
  add column if not exists source text not null default 'upload',
  add column if not exists prompt text;

-- Settings: cost per generation, free monthly grant, card-purchase bonus.
insert into public.vcard_settings (key, value)
values
  ('ai.credit_cost_per_image', to_jsonb(1)),
  ('ai.free_monthly_credits',  to_jsonb(3)),
  ('ai.free_monthly_credits_pro',  to_jsonb(20)),
  ('ai.free_monthly_credits_team', to_jsonb(60)),
  ('ai.card_purchase_bonus_credits', to_jsonb(10))
on conflict (key) do nothing;
