---
description: Add a new Stripe SKU (one-time card/merch or subscription tier).
---

# Skill: Add a Stripe SKU

## When to use
User asks to add a new product to the shop or a new subscription plan.

## Steps
1. Decide if it's a one-time SKU (cards/merch) or recurring (sub plan).
2. **One-time:** insert a row into `vcard_products` via `supabase/seed.sql`. Use cents for `price_cents`. Set `sku` per §10.1 naming.
3. **Recurring:** create the price in Stripe Dashboard, add the price ID to `.env.example` and `apps/web/lib/stripe.ts` `PRICE_IDS` map.
4. Update `apps/web/lib/entitlements.ts` if the SKU changes feature gating (e.g., card purchase grants storage bonus).
5. Update `app/api/stripe/webhook/route.ts` `checkout.session.completed` handler to apply the side effects (storage bonus, verified-badge auto-grant, referral credit, etc.).
6. Add a Playwright spec at `apps/web/e2e/shop-<sku>.spec.ts` covering: add to cart → checkout → webhook fires → DB row created → entitlement updated.
7. Update §10.1 SKU matrix in `BUILD_PLAN.md`.

## Card-purchase side effects (do not forget)
- `bonus_storage_bytes += 1_000_000_000` (cap 25 GB).
- If SKU ∈ {`card-metal`, `card-custom`, `bundle-starter`, `team-5pack`}: auto-approve Verified badge.
- If user came via a referral cookie: credit the referrer $5 store credit.
