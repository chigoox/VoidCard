# Supabase schema contract (vCard project)

This project now expects shared Supabase with these tables:

## Shared table (no prefix)
- `profile`
  - `username` text primary/unique
  - `name` text
  - `title` text
  - `bio` text
  - `links` jsonb
  - `theme` jsonb

## Project-specific tables (prefixed with `vcard_`)
- `vcard_cards`
  - `card_id` text primary/unique
  - `username` text (references `profile.username`)

- `vcard_carts`
  - `username` text primary/unique
  - `items` jsonb

- `vcard_taps`
  - `id` bigint generated identity primary key
  - `card_id` text
  - `username` text
  - `tapped_at` timestamptz

## Roles table
- `admin_users`
  - `user_id` text primary/unique
  - `role` text (`admin`, `manager`, `user`)

## RLS guidance
- `profile`: allow read for public, write for owner/admin.
- `vcard_cards`: write only `admin`/`manager`.
- `vcard_carts`: owner-only read/write.
- `vcard_taps`: insert allowed for public route; read restricted.
