# VoidCard — Copilot Repo Instructions

VoidCard is a SaaS competitor to dotcards.net (NFC business cards + customizable link-in-bio profiles + shop). Production target: `vcard.ed5enterprise.com`.

## Stack (locked)
- **Next.js 16 App Router** + **React 19** + **TypeScript strict**.
- **Tailwind 3.4** with CSS variables. Design tokens are **Onyx Gold** (see `BUILD_PLAN.md` §A).
- **Supabase SSR** — shared project across the ED5 ecosystem. All app tables prefixed `vcard_`. The `profiles` table is shared (read-only `id` + `role`).
- **Stripe** for shop + Pro/Team subs. **Resend** email. **Vercel** hosting.
- **Upstash Redis** for rate-limit + edge caches. **PostHog** + **Vercel Analytics**. **Sentry**.
- **Playwright** for E2E.
- **PWA** via `@serwist/next`.
- Cookie domain for SSO across ED5: `.ed5enterprise.com`.

## Repo layout
- `apps/web/` — production Next.js app (build target).
- Root-level Vite app is **legacy** and should not be modified for new feature work.
- `supabase/migrations/` — numbered SQL migrations.
- `BUILD_PLAN.md` — single source of truth (47+ sections). Read before any non-trivial change.

## Conventions
- Server Components by default. Mark with `"use client"` only when needed.
- All DB writes go through server actions or route handlers. Never use the anon key on the server for writes.
- Entitlement check is mandatory on every gated server action: `entitlementsFor(plan, bonuses).<feature>`.
- Use `lib/supabase/{client,server,admin}.ts`. Never import `createClient` from `@supabase/supabase-js` directly in app code.
- Currency is USD cents (`integer`) everywhere in DB and Stripe. Display layer formats.
- Times: store `timestamptz`, render with user's locale + timezone.
- IDs: `uuid` from `gen_random_uuid()` for app rows; `auth.users.id` for users.

## Plan tier model (do not regress)
- **Free** is the default and powerful. Free includes: all 12 themes, full custom CSS, all 17 section types, wallet pass, embed widget, full analytics, 1-way contact capture, 5 GB storage, 1 profile, 1 paired card.
- **Pro** ($4.99/mo) gates: custom domain, brand removal, multi-profile (10), 2-way exchange, lead forms, API+webhooks, custom font, password protect, scheduled publish, A/B variants, CSV export, weekly digest, 50 GB.
- **Team** ($14.99/mo): Pro + 10 seats + brand kit + 250 GB pooled.
- **Verified Badge**: separate $5 one-time. Auto-granted with metal/custom/bundle/team-5pack purchase. Required for custom-art card SKU + apex custom domain + non-HTTPS webhooks.

## Writing code
- Prefer composing primitives from `components/ui/*` over re-styling.
- All public pages must support SSR/Edge runtime; do not import server-only modules in client components.
- Public profile (`/u/[username]`) must score ≥95 on Lighthouse mobile.
- Every new server action must have a Playwright happy-path E2E.

## When in doubt
1. Re-read the relevant section of `BUILD_PLAN.md`.
2. Match the conventions in existing files in `apps/web/`.
3. Ask the user before making destructive changes (deleting files, dropping tables, force-push).
