---
applyTo: "supabase/**/*.sql,apps/web/lib/supabase/**/*.ts,apps/web/**/actions.ts"
---

# Supabase Conventions

## Tables
- Every app table is prefixed `vcard_`.
- The `profiles` table is shared across the ED5 ecosystem and **read-only** to this app. Do not add columns to it; extend via `vcard_profile_ext`.
- `id uuid primary key default gen_random_uuid()` on every table.
- Timestamps: `created_at timestamptz default now()`, `updated_at timestamptz default now()`. Use a generic `set_updated_at` trigger.
- Money in `integer` cents. Currency assumed USD unless an explicit `currency text` column exists.

## RLS (mandatory)
- Every `vcard_*` table has RLS enabled.
- Owner-only by default: `using (auth.uid() = user_id)`.
- Public-read tables (e.g., published profile fields): explicit policy reading from `vcard_profile_ext.published = true`.
- Admin override via `auth.jwt() ->> 'role' = 'admin'`.

## Migrations
- One feature per file, numbered `NNNN_short_name.sql`.
- Idempotent where reasonable (`create table if not exists`, `do $$ ... $$`).
- Never edit a committed migration; add a new one.

## Clients
- `lib/supabase/client.ts` — browser. Anon key.
- `lib/supabase/server.ts` — RSC + route handlers. Reads cookies. Anon key.
- `lib/supabase/admin.ts` — service role. Server only. Used for webhooks, cron, admin actions.
