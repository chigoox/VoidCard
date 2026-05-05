# VoidCard

Production NFC business card + link-in-bio + shop SaaS.
Production target: `vcard.ed5enterprise.com`. Build target: `apps/web/`.

> **The legacy Vite app at the repo root is preserved** but is not the build target.
> All new feature work goes in `apps/web/`.

---

## Quick start

```bash
pnpm i
cp apps/web/.env.example apps/web/.env.local   # fill values
pnpm -C apps/web dev
```

Run E2E:

```bash
pnpm -C apps/web exec playwright install --with-deps
pnpm -C apps/web exec playwright test
```

---

## Stack

| Layer        | Choice                                                |
|--------------|--------------------------------------------------------|
| Framework    | Next.js 16 App Router · React 19 · TypeScript strict   |
| UI           | Tailwind 3.4 · Onyx Gold tokens · Fraunces + Inter     |
| Data         | Supabase Postgres (shared with ED5 ecosystem)         |
| Auth         | Supabase SSR · cookie domain `.ed5enterprise.com`     |
| Payments     | Stripe · USD cents everywhere                         |
| Cache/RL     | Upstash Redis + Ratelimit                             |
| Email        | Resend                                                 |
| Analytics    | PostHog · Vercel Analytics · Sentry                   |
| E2E          | Playwright                                             |
| PWA          | `@serwist/next`                                       |
| Hosting      | Vercel                                                 |

---

## Plan tiers (locked — see `BUILD_PLAN.md` §A)

- **Free** — powerful by default. All 12 themes, full custom CSS, all 17 sections, wallet pass, embed widget, full analytics, 1-way contact capture, 5 GB, 1 profile, 1 paired card.
- **Pro $4.99/mo** — custom domain, brand removal, multi-profile (10), 2-way exchange, lead forms, API + webhooks, custom font upload, password protect, scheduled publish, A/B variants, CSV export, weekly digest, 50 GB.
- **Team $14.99/mo** — Pro + 10 seats + brand kit + 250 GB pooled.
- **Verified Badge $5 one-time** — auto-granted with `card-metal`, `card-custom`, `bundle-starter`, or `team-5pack` purchase. Required for custom-art card SKU + apex custom domain + non-HTTPS webhooks.

Storage bonus: every card purchased grants **+1 GB**, capped at **+25 GB**.

---

## Repo layout

```
apps/web/                Next.js 16 app (build target)
  app/
    (auth)/              login, signup
    (app)/               dashboard, edit, links, insights
    api/                 auth, stripe, v1, short
    u/[username]/        public profile (Edge SSR)
  components/sections/   Section renderers (server)
  lib/                   supabase, auth, entitlements, stripe, sections, rate-limit
  e2e/                   Playwright specs
supabase/migrations/     Numbered SQL migrations 0001..0023
.github/
  copilot-instructions.md   Repo-wide rules
  agents/                  voidcard-builder, voidcard-tester
  instructions/            typescript, supabase, playwright (applyTo-scoped)
  skills/                  add-section-type, add-stripe-sku
BUILD_PLAN.md            Single source of truth (47+ sections)
```

---

## Supabase

Migrations in `supabase/migrations/` (numbered). Apply with:

```bash
supabase db push
pnpm -C apps/web supabase:types   # regenerates apps/web/lib/supabase/database.types.ts
```

All app tables are prefixed `vcard_`. The shared `profiles` table is read-only (`id` + `role`).

RLS rules:
- `vcard_profile_ext` — owner read/write; public read where `published = true`
- `vcard_taps` / `vcard_orders` — owner read; admin write via service role
- All writes go through server actions or `/api/*` route handlers

---

## Stripe

Set `STRIPE_PRICE_*` env vars to real price IDs after creating products.
Webhook endpoint: `POST /api/stripe/webhook`.

Side effects on `checkout.session.completed`:
- Subscription → upsert `vcard_subscriptions`, set `vcard_profile_ext.plan`
- One-time → create order rows, apply +1 GB storage bonus per card SKU (cap 25 GB), grant Verified for `card-metal | card-custom | bundle-starter | team-5pack`, credit referrer $5
- Verified-badge SKU → mark `vcard_verifications` row pending

---

## Public API v1

Bearer auth via `vcard_api_keys.hash` (sha256 of `vk_…` token).
Pro = 60 req/m. Team/Enterprise = 600 req/m.

- `GET /api/v1/profile`
- `GET /api/v1/insights/summary?days=30`

---

## E2E

Specs in `apps/web/e2e/`:
- `auth.spec.ts` — home → login flow, signup validation
- `profile-public.spec.ts` — public profile renders + perf smoke
- `builder.spec.ts` — add section → save draft → publish (uses authenticated `storageState`)
- `api-v1.spec.ts` — bearer required + happy path

Authenticated builder spec needs `e2e/.auth/user.json`. Generate via your own `e2e/auth.setup.ts` that signs in once with a test email.

---

## Copilot agents & skills

- **`@voidcard-builder`** — feature implementation
- **`@voidcard-tester`** — Playwright spec authoring

Skills under `.github/skills/` codify common workflows (`add-section-type`, `add-stripe-sku`).
Instructions under `.github/instructions/` apply automatically by glob (`typescript`, `supabase`, `playwright`).

---

## Status (handoff)

✅ Plan v1.3 + §48 Growth & Funnel
✅ Agent + skills + instructions layer
✅ Tailwind/fonts/globals (Onyx Gold)
✅ Supabase migrations 0001–0023 (gaps 0007/0011/0012/0013/0018 reserved)
✅ Supabase clients · middleware · auth · entitlements · rate-limit · stripe
✅ Marketing home · login · signup · auth callback
✅ App layout (bottom tabs) · dashboard · edit · links · insights
✅ 17 section schemas + renderer
✅ Public profile `/u/[username]` (Edge SSR)
✅ Stripe webhook (subs + one-time + storage + verified + referral)
✅ Public API v1 (`/profile`, `/insights/summary`)
✅ Short-link redirect `/api/short/[code]`
✅ Playwright config + 4 specs

⏳ Onboarding wizard (`/onboarding`)
⏳ Shop checkout flow + product pages
⏳ Custom domain provisioning
⏳ Wallet pass generation
⏳ 2-way contact exchange UI
⏳ Webhooks delivery worker
⏳ Auth setup script for builder spec
⏳ OG image route `/og/[username]`
