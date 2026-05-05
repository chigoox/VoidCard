# VoidCard Shipping Status

This file tracks what is actually wired in `apps/web` today, not the full BUILD_PLAN ambition.

Last audited against code on 2026-05-05.

## Shipped

- Marketing site, pricing page, feature grid, comparison table, contact/customers/press style pages.
- Core authenticated app surfaces: dashboard, editor, links, insights, cards, orders, account settings, contacts, and team basics.
- Public profile renderer, short links, tap redirects, discovery baseline, lead capture, and two-way contact exchange.
- Stripe checkout with inline product pricing instead of Stripe Price ID runtime dependence.
- Shop ordering, order admin, product/plan admin, subscription admin, user admin, and admin verification review.
- Team basics: team creation, invites, member removal, and brand kit editing.
- Pro feature slices that now have real app wiring: A/B variants, custom font uploads, API key issuance, public API v1 profile/insights routes, and webhook configuration UI.
- Custom domains: account onboarding, DNS instructions, background verification, live host rewrites, and Vercel project attach/detach automation.
- Wallet passes: Apple and Google delivery routes, Apple web-service registration/list/fetch/log routes, and Google wallet sync endpoint/tooling.
- Verified Badge workflow: purchase route, user proof submission, anti-abuse risk scoring, lifecycle emails, admin review/approve/reject/revoke, and automatic 24h private-document cleanup with persistent hash evidence.
- PWA/SEO baseline: manifest, sitemap, robots.txt route, metadata tests, and Playwright public SEO coverage.

## Partial

- Public directory / discovery: `/discover` and `GET /api/discover` ship search, featured profiles, and category filters derived from live public sections, but sitemap surfacing and richer editorial curation are still missing.
- API + webhooks: API key issuance, docs, bearer-auth profile/insights routes, and webhook listing/config surfaces exist, but outbound webhook delivery lifecycle and broader event coverage are still thin.
- Scheduled publish: the editor publish flow recognizes `scheduled_publish_at` gating, but a complete end-user scheduling workflow is still thin.
- CMS/admin surfaces exist, but several plan-gated experiences are still thinner than BUILD_PLAN.
- Compliance/privacy foundations exist in schema, legal, audit, CSP, and admin areas, but not every GDPR/CCPA automation path is fully productized.

## Not Shipped Yet

- Multi-profile management workflow up to the advertised Pro limit.
- Password-protected public profiles.
- CSV export delivery for analytics/contacts.
- Weekly digest delivery workflows.
- Full outbound webhook operations beyond basic configuration/storage.
- Remaining deeper roadmap items from BUILD_PLAN that still do not have app routes or operational wiring.