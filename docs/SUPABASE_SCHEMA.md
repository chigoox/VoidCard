# VoidCard Supabase Schema

Single shared Supabase project across the ED5 ecosystem. All app tables prefixed
`vcard_`. The `profiles` table is shared and read-only for VoidCard (only `id` +
`role` are consumed).

Migrations live under `supabase/migrations/` and are numbered. Apply with
`supabase db push` against the shared project.

## Migration index

| File | Purpose |
|---|---|
| `0001_vcard_init.sql` | `vcard_profile_ext` + helpers (`set_updated_at`, citext) |
| `0002_vcard_media.sql` | gallery / hero media library |
| `0003_vcard_cards.sql` | physical NFC card lifecycle |
| `0004_vcard_shortlinks.sql` | `vc.ed5e.co/<code>` redirects |
| `0005_vcard_taps.sql` | tap / view event log (IP-hashed) |
| `0006_vcard_shop.sql` | products, orders, line items |
| `0008_vcard_subscriptions.sql` | Stripe subscriptions (Pro / Team) |
| `0009_vcard_teams.sql` | teams, members, invites |
| `0010_vcard_custom_domains.sql` | per-user vanity domains |
| `0014_vcard_api_webhooks.sql` | API keys, webhooks, deliveries |
| `0015_vcard_wallet.sql` | Apple / Google Wallet pass metadata |
| `0016_vcard_exchange.sql` | 2-way contact exchange tokens |
| `0017_vcard_verifications.sql` | Verified Badge ($5 / earned) |
| `0019_vcard_seed.sql` | reserved usernames + default products |
| `0020_vcard_referrals.sql` | referrals + store credits |
| `0021_vcard_product_reviews.sql` | shop product reviews |
| `0022_vcard_notifications.sql` | in-app notification feed |
| `0023_vcard_growth.sql` | achievements, prompts, churn survey, funnel events |
| `0024_vcard_seed_voidluxury.sql` | demo profile (`/u/voidluxury`) |
| `0025_vcard_cms.sql` | `vcard_plans`, site settings KV |
| `0026_vcard_compliance.sql` | audit log, DSR jobs, consent log, Stripe idempotency, CSP reports |
| `0027_vcard_seo_ai.sql` | SEO + AI crawler controls + redirect table |
| `0028_vcard_storage.sql` | three storage buckets + RLS |
| `0029_vcard_complete.sql` | flags, carts, lead forms, brand kit, fonts, A/B variants, NFC JTI, admin notes, email outbox, soft-delete tombstones |
| `0030_vcard_search_realtime.sql` | FTS indexes, hot-path indexes, daily-tap view, realtime publication |
| `0031_vcard_cron.sql` | pg_cron schedules: DSR hard-delete + retention prunes |

## Storage buckets (0028)

| Bucket | Public | Limit | MIME allowlist |
|---|---|---|---|
| `vcard-public` | yes | 50 MB / file | image/* + mp4/webm |
| `vcard-private` | no | 100 MB / file | pdf, zip, json, csv, image/* |
| `vcard-fonts` | yes | 5 MB / file | woff2 |

Path convention: `{bucket}/u/{user_id}/{kind}/{filename}`.

## Cron schedules (0031)

All runs UTC. `pg_cron` extension required.

| Job | Cadence | Action |
|---|---|---|
| `vcard_dsr_hard_delete` | hourly | finalise expired delete-requests |
| `vcard_taps_prune` | daily 03:15 | drop taps older than 400d |
| `vcard_audit_prune` | daily 03:30 | drop audit rows older than 2y |
| `vcard_csp_prune` | daily 03:45 | drop CSP reports older than 30d |
| `vcard_stripe_events_prune` | daily 04:00 | drop Stripe events older than 90d |
| `vcard_nfc_jti_prune` | daily 04:15 | drop used JTIs older than 60d |
| `vcard_consent_prune` | daily 04:30 | drop consent rows older than 5y |
| `vcard_crawl_prune` | daily 04:45 | drop crawl-log rows older than 30d |
| `vcard_dsr_export_expire` | daily 05:00 | expire stale export download URLs |

## RLS guarantees (cross-cutting)

- `vcard_profile_ext`: owner full RW; public SELECT requires `published = true AND deleted_at IS NULL`.
- `vcard_taps`, `vcard_csp_reports`, `vcard_stripe_events`, `vcard_email_outbox`,
  `vcard_nfc_jti`: writes via service-role only.
- `vcard_audit_log`: admin SELECT all; user SELECT only rows targeting them.
- `vcard_dsr_log`, `vcard_consent_log`: owner-read; service-role writes.
- `vcard_team_members` / `vcard_brand_kits`: scoped to team membership; admin role for kit writes.
- `vcard_admin_notes`, `vcard_flags`: admin RW; flags are world-readable.
- All bucket policies key off `(storage.foldername(name))[2] = auth.uid()::text`.

## Required Postgres extensions

`pgcrypto`, `citext`, `pg_trgm`, `pg_cron` (Supabase managed).
