# Launch Readiness Checklist

## 1) Environment & Secrets
- [ ] `VITE_SUPABASE_URL` configured in production.
- [ ] `VITE_SUPABASE_ANON_KEY` configured in production.
- [ ] `VITE_REQUIRE_SUPABASE=true` in production.
- [ ] `VITE_EDGE_CONNECT_CARD_URL` configured and reachable.

## 2) Supabase Security
- [ ] RLS enabled on `profile`, `vcard_cards`, `vcard_carts`, `vcard_taps`, `admin_users`.
- [ ] Write policies enforce owner/admin constraints.
- [ ] Edge function validates card-link requests.

## 3) Product Critical Flows
- [ ] Login with Supabase password auth works.
- [ ] Save profile as owner succeeds; unauthorized update blocked.
- [ ] Connect card succeeds for `admin/manager`; rejected for basic users.
- [ ] `/c/:cardId` logs tap and redirects to `/u/:username`.

## 4) Observability
- [ ] Monitor edge-function errors and Supabase API failures.
- [ ] Dashboard query for recent `vcard_taps` verified.

## 5) CI Commands
- [ ] `npm run validate:env` (in production CI)
- [ ] `npm run test`
- [ ] `npm run test:e2e:smoke`
- [ ] `npm run build`
