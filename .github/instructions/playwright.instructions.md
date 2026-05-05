---
applyTo: "apps/web/e2e/**/*.spec.ts,apps/web/playwright.config.ts"
---

# Playwright E2E Conventions

- Specs live in `apps/web/e2e/<flow>.spec.ts`.
- Use the project's `test` fixture from `e2e/fixtures.ts` (provides authed page, admin client, stripe helper).
- Selectors: `getByTestId('foo')` first, then role-based, never raw text.
- Each test self-contains state. Seed via `admin` client; clean up in `afterEach` via the same.
- Don't use `page.waitForTimeout` — wait for testIds / network idle / visible.
- Mark long flows with `test.slow()`; aim for <8s per test on CI.
- Screenshot on failure is on by default; do not disable.
- Stripe: use `STRIPE_TEST_*` env. Webhook delivery via `stripe trigger` in the test runner (helper in `e2e/stripe-helper.ts`).
