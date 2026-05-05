-- 0005 vcard_taps: NFC + QR + link taps

create table if not exists public.vcard_taps (
  id           bigserial primary key,
  user_id      uuid not null references auth.users(id) on delete cascade,
  card_id      uuid references public.vcard_cards(id) on delete set null,
  shortlink_id uuid references public.vcard_shortlinks(id) on delete set null,
  source       text not null,                       -- nfc|qr|link|embed|share
  ua_hash      text,
  ip_hash      text,
  country      text,
  region       text,
  city         text,
  referrer     text,
  utm          jsonb,
  occurred_at  timestamptz not null default now()
);
create index if not exists vcard_taps_user_time_idx on public.vcard_taps (user_id, occurred_at desc);
create index if not exists vcard_taps_card_idx     on public.vcard_taps (card_id);

alter table public.vcard_taps enable row level security;
drop policy if exists vcard_taps_owner_read on public.vcard_taps;
create policy vcard_taps_owner_read on public.vcard_taps
  for select to authenticated using (auth.uid() = user_id);
-- inserts only via service-role (server actions / webhooks).
