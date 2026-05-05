-- 0030 vcard_search_realtime — full-text search indexes, helper views,
-- and realtime publication setup.
-- Idempotent.

-- =============================================================================
-- 1. Full-text search on profiles (admin user search + public discovery).
-- =============================================================================
alter table public.vcard_profile_ext
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(username::text,'')), 'A') ||
    setweight(to_tsvector('simple', coalesce(display_name,'')),  'A') ||
    setweight(to_tsvector('simple', coalesce(bio,'')),           'B')
  ) stored;

create index if not exists vcard_profile_ext_search_tsv_idx
  on public.vcard_profile_ext using gin (search_tsv);

-- Trigram fuzzy search for username autocomplete + reserved-name lookup.
create extension if not exists pg_trgm;

create index if not exists vcard_profile_ext_username_trgm_idx
  on public.vcard_profile_ext using gin (lower(username::text) gin_trgm_ops);

-- =============================================================================
-- 2. Full-text search on shop products.
-- =============================================================================
alter table public.vcard_products
  add column if not exists search_tsv tsvector
  generated always as (
    setweight(to_tsvector('simple', coalesce(name,'')),        'A') ||
    setweight(to_tsvector('simple', coalesce(description,'')), 'B') ||
    setweight(to_tsvector('simple', coalesce(sku,'')),         'C')
  ) stored;

create index if not exists vcard_products_search_tsv_idx
  on public.vcard_products using gin (search_tsv);

-- =============================================================================
-- 3. Helpful indexes for hot read paths.
-- =============================================================================
create index if not exists vcard_orders_user_created_idx
  on public.vcard_orders (user_id, created_at desc);

create index if not exists vcard_orders_email_idx
  on public.vcard_orders (lower(email));

create index if not exists vcard_subscriptions_user_idx
  on public.vcard_subscriptions (user_id, status);

create index if not exists vcard_taps_card_tapped_idx
  on public.vcard_taps (card_id, occurred_at desc);

create index if not exists vcard_taps_user_tapped_idx
  on public.vcard_taps (user_id, occurred_at desc);

create index if not exists vcard_notifications_user_unread_idx
  on public.vcard_notifications (user_id, created_at desc)
  where read_at is null;

-- =============================================================================
-- 4. Per-day tap rollup view (cheap dashboard reads).
-- =============================================================================
create or replace view public.vcard_tap_daily as
  select
    user_id,
    date_trunc('day', occurred_at) as day,
    count(*)::bigint as taps,
    count(distinct ip_hash)::bigint as uniques
  from public.vcard_taps
  group by user_id, date_trunc('day', occurred_at);

-- View security inherits from base table RLS (Postgres 15+).

-- =============================================================================
-- 5. Realtime publication — opt-in tables only (avoid leaking secrets).
-- =============================================================================
do $$
declare
  pub_exists boolean;
begin
  select exists(select 1 from pg_publication where pubname = 'supabase_realtime') into pub_exists;
  if pub_exists then
    -- Add tables idempotently. Ignore "already in publication" errors.
    begin
      execute 'alter publication supabase_realtime add table public.vcard_taps';
    exception when duplicate_object then null;
    end;
    begin
      execute 'alter publication supabase_realtime add table public.vcard_notifications';
    exception when duplicate_object then null;
    end;
    begin
      execute 'alter publication supabase_realtime add table public.vcard_form_submissions';
    exception when duplicate_object then null;
    end;
    begin
      execute 'alter publication supabase_realtime add table public.vcard_orders';
    exception when duplicate_object then null;
    end;
  end if;
end $$;

-- =============================================================================
-- 6. Server-side search helper (admin user search).
-- =============================================================================
create or replace function public.vcard_search_profiles(q text, lim int default 25)
returns setof public.vcard_profile_ext
language sql stable security definer set search_path = public as $$
  select * from public.vcard_profile_ext
  where (
    search_tsv @@ websearch_to_tsquery('simple', q)
    or lower(username::text) like '%' || lower(q) || '%'
  )
  order by published desc, updated_at desc
  limit greatest(1, least(coalesce(lim, 25), 100))
$$;

revoke all on function public.vcard_search_profiles(text, int) from public, anon;
grant execute on function public.vcard_search_profiles(text, int) to authenticated;
