-- 0003 vcard_cards: physical NFC cards + lifecycle
create table if not exists public.vcard_cards (
  id           uuid primary key default gen_random_uuid(),
  serial       text unique not null,                           -- printed on card
  sku          text not null,                                  -- card-pvc|card-metal|card-custom|...
  user_id      uuid references auth.users(id) on delete set null,
  paired_at    timestamptz,
  status       text not null default 'unprovisioned',          -- unprovisioned|sold|active|lost|replaced
  nfc_jti      text unique,                                    -- rotating signed token id
  last_tap_at  timestamptz,
  total_taps   bigint not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists vcard_cards_user_idx on public.vcard_cards (user_id);

alter table public.vcard_cards enable row level security;
drop policy if exists vcard_cards_owner_rw on public.vcard_cards;
create policy vcard_cards_owner_rw on public.vcard_cards
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
