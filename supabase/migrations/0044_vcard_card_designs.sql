-- 0044 vcard_card_designs: user-saved custom card designs from the in-app
-- Konva-based designer. Stores the design document (front/back JSON) plus
-- an optional preview image URL. Designs are private by default and can be
-- attached to a custom-art card SKU at checkout.

create table if not exists public.vcard_card_designs (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  name         text not null default 'Untitled card',
  doc          jsonb not null default '{}'::jsonb,    -- { front: {...}, back: {...}, w, h }
  preview_url  text,                                  -- public url of front preview
  status       text not null default 'draft',        -- draft|ordered|printed
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint vcard_card_designs_status_check check (status in ('draft', 'ordered', 'printed'))
);

drop trigger if exists vcard_card_designs_updated_at on public.vcard_card_designs;
create trigger vcard_card_designs_updated_at
  before update on public.vcard_card_designs
  for each row execute function public.set_updated_at();

create index if not exists vcard_card_designs_user_idx
  on public.vcard_card_designs (user_id, updated_at desc);

alter table public.vcard_card_designs enable row level security;

drop policy if exists vcard_card_designs_owner_rw on public.vcard_card_designs;
create policy vcard_card_designs_owner_rw on public.vcard_card_designs
  for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
