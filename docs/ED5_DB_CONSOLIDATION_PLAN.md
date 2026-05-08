# ED5 Cross-App Database Consolidation Plan

> **Status:** planning only. No migrations have been executed. This document
> captures the long-term direction for unifying VoidCard and Boox (and future
> ED5 Enterprise apps) on a shared identity + data foundation.

## 1. Current state

| Concern        | VoidCard                                     | Boox                                            |
| -------------- | -------------------------------------------- | ----------------------------------------------- |
| Auth           | Supabase Auth (email/password + OAuth)       | Firebase Auth (email/password + OAuth)          |
| Identity store | `auth.users` + shared `profiles` table       | Firebase user records + Firestore `Owners` doc  |
| App data       | Postgres tables prefixed `vcard_*`           | Firestore collections (`Owners`, `Apointment`…) |
| Payments       | Stripe Connect Express (VoidCard platform)   | Stripe Connect Express (Boox platform)          |
| Analytics      | `vcard_taps` (Postgres)                      | Custom Firestore docs                           |

## 2. What Phase 1–4 already delivered

The following bridges already make the two apps behave as one product surface,
without consolidating storage:

1. **Section embed (Phase 1).** VoidCard renders a Boox booking widget via
   iframe (`/u/<username>` → `<owner>/Booking?embed=1`).
2. **SSO bridge (Phase 2).** VoidCard mints a short-lived HS256 JWT
   (`BOOX_SSO_SECRET`); Boox exchanges it for a Firebase custom token whose
   uid **equals the Supabase `user.id`**. Cookie domain `.ed5enterprise.com`.
3. **Stripe Connect unification (Phase 3).** Each app, when creating an
   Express account for a user, first asks the sister app
   (`GET /api/internal/stripe-account?uid=…` with `ED5_SERVICE_SECRET`) and
   reuses the existing `acct_…` if Stripe still recognises it for the local
   platform. Otherwise it creates a fresh account and stamps the user's
   shared `ed5_user_id` into Stripe metadata.
4. **Cross-app webhooks (Phase 4).**
   - Boox `checkout.session.completed` → `POST` VoidCard
     `/api/internal/track-event` (records a tap with `source = "boox-book"`).
   - Boox `CheckoutConnected` queries VoidCard
     `GET /api/internal/plan?uid=…` so a VoidCard Pro/Team owner gets the
     reduced platform fee in Boox.

This means **Supabase `user.id` is already the canonical ED5 user id** for
any user who came through SSO. Native Boox-only owners still exist as
Firebase-only ids until they create a VoidCard account.

## 3. Consolidation goals

1. Single source of truth for **identity + plan + verification**.
2. Single source of truth for **billing/Stripe Connect** per user.
3. Cross-product analytics in one warehouse for revenue/marketing.
4. No big-bang cutover — each phase keeps both apps fully operational.

## 4. Target architecture

- **Identity:** Supabase Auth becomes the system of record. Boox keeps using
  Firebase Auth as the *runtime* (cheap CDN-edge tokens, native Firestore
  rules) but **always provisions Firebase users with `uid = supabase user.id`**.
  - Already true for SSO arrivals. Remaining work: when a user signs up
    natively on Boox, mirror the user into Supabase before issuing the
    Firebase token (or block native signup and force SSO).
- **Owner profile data:** Move `Owners/<uid>` fields that are user-controlled
  (siteInfo, bookingRules, services, etc.) into a new Postgres table
  `boox_owners` with `user_id uuid references auth.users(id)` PK and
  per-row RLS (`auth.uid() = user_id` for writes; public read for the
  fields needed by the booking widget). Firestore stays as a write-through
  cache *during migration only*, then becomes read-only, then is removed.
- **Appointments / bookings:** Migrate `Apointment` collection to a new
  `boox_appointments` table. RLS: owner can read/write their own rows,
  service role inserts on behalf of webhooks. Customer-facing reads happen
  via signed view (`boox_appointments_public`).
- **Payments:** Run Stripe Connect on a single platform account
  (recommended: VoidCard's, since it's the one publishing the customer
  brand). Boox switches to using `stripeAccountID` looked up via
  `/api/internal/stripe-account` and stops creating accounts on its own
  platform. Until then, the Phase 3 mirror is sufficient.
- **Analytics:** Both apps write to `vcard_taps` (rename later to
  `ed5_events` with `app text`, `event text`, `user_id uuid`, `payload jsonb`).
  Phase 4's `/api/internal/track-event` is the seed for this.

## 5. Migration phases (long-term)

### Phase A — Identity backfill (low risk, reversible)

1. Add nullable `supabase_user_id` to Boox `Owners` for any owner who
   doesn't already have one (i.e. native Boox signups).
2. Background job: for each such owner, create a Supabase user (admin API)
   with the same email and update Firebase uid to match.
3. Once 100% of `Owners` carry a Supabase id, lock Boox native signup
   behind the SSO flow (Supabase → Firebase custom token).

**Rollback:** disable the job; SSO already works for new signups.

### Phase B — Mirror plan + verification onto Boox (1 week)

1. VoidCard subscription webhook (`stripe.customer.subscription.*`) calls
   `POST <BOOX>/api/internal/plan-update` with `{ uid, plan, verified }`.
2. Boox stores the values on `Owners/<uid>.vcardPlan` (already partially
   in place) and uses them in feature gates.

**Status:** Phase 4 added the *pull* path (`fetchVcardPlan` from Boox →
VoidCard). The push path is still TODO and is a small follow-up.

### Phase C — Dual-write owner profile fields (2–3 weeks)

1. Create `boox_owners` table in Supabase (mirroring the fields the booking
   widget actually reads).
2. Modify the Boox owner-edit pages to write to **both** Firestore and the
   new Supabase table via a shared server action.
3. Add a Supabase view/RPC the booking embed can read directly so it stops
   relying on Firestore for public reads.
4. Backfill existing owners.

**Rollback:** stop dual-writes; Firestore remains authoritative.

### Phase D — Cut public reads to Postgres (1 week)

1. Public booking widget reads `boox_owners` instead of Firestore.
2. Firestore reads become an internal admin-only fallback.
3. Firestore writes still happen (Phase C continues) until everything is
   stable for ≥30 days.

### Phase E — Migrate appointments (2 weeks)

1. New writes go to `boox_appointments` (Supabase) **first**; Firestore
   becomes an async mirror.
2. Boox webhook (`checkout.session.completed`) inserts the row in Supabase
   directly; the existing Firestore `addToDoc('Apointment', …)` becomes a
   secondary write via service role.
3. After 30 days of clean dual-write, flip reads.

### Phase F — Decommission Firestore (gated on ≥60 days clean reads)

1. Make Firestore writes no-op.
2. Export final snapshot for cold storage.
3. Disable Firebase project (keep Auth project until a separate auth
   migration story is planned — see *Open question* below).

## 6. Risks

- **Stripe Connect platform mismatch.** A user has `acct_…` on Boox's
  platform but VoidCard's platform doesn't recognise it. *Mitigation:*
  Phase 3 already gates the reuse on a successful
  `stripe.accounts.retrieve` and falls back to creating a fresh account.
- **Email collisions during identity backfill.** A user might exist in
  Supabase with one email and in Firebase with another (typo, alias).
  *Mitigation:* match on verified email only; surface the rest for human
  review.
- **Firestore security rules diverge from RLS.** During dual-read, both
  must enforce the same authorisation. *Mitigation:* generate both from a
  single declarative source where possible; otherwise add a CI check that
  diffs them.
- **Cost.** Adding Postgres rows for every appointment increases Supabase
  storage. *Mitigation:* archive appointments older than 24 months to cold
  table.

## 7. Open questions

- **Should Boox keep Firebase Auth long-term?** Firebase Auth is genuinely
  good and cheap; consolidating Auth is a much bigger lift than
  consolidating data. Recommendation: **keep Firebase Auth for now**, with
  Supabase as the system of record for `user_id`. Revisit once Boox is
  fully on Postgres for app data.
- **Single Stripe platform vs federated.** The federated model (current)
  works as long as each app only takes payment for its own SKUs.
  Consolidating onto one platform makes accounting cleaner but requires a
  Stripe Connect migration request. Defer until volume justifies it.

## 8. Owners

- VoidCard: Edward (lead), VoidCard team.
- Boox: Edward (lead), Boox team.
- This document lives in `VoidCard/docs/` and is the single source of
  truth for the consolidation roadmap. Update it as phases ship.
