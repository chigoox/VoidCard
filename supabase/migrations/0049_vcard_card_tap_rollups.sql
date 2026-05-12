-- Keep per-card tap counters aligned with the canonical vcard_taps event log.

create or replace function public.vcard_apply_card_tap_rollup()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.card_id is not null then
    update public.vcard_cards
    set
      total_taps = total_taps + 1,
      last_tap_at = coalesce(greatest(last_tap_at, new.occurred_at), new.occurred_at)
    where id = new.card_id;
  end if;

  return new;
end;
$$;

drop trigger if exists vcard_taps_card_rollups on public.vcard_taps;
create trigger vcard_taps_card_rollups
after insert on public.vcard_taps
for each row execute function public.vcard_apply_card_tap_rollup();

with aggregated as (
  select
    card_id,
    count(*)::bigint as total_taps,
    max(occurred_at) as last_tap_at
  from public.vcard_taps
  where card_id is not null
  group by card_id
)
update public.vcard_cards as cards
set
  total_taps = aggregated.total_taps,
  last_tap_at = aggregated.last_tap_at
from aggregated
where cards.id = aggregated.card_id;

update public.vcard_cards as cards
set
  total_taps = 0,
  last_tap_at = null
where not exists (
  select 1
  from public.vcard_taps as taps
  where taps.card_id = cards.id
)
and (cards.total_taps <> 0 or cards.last_tap_at is not null);