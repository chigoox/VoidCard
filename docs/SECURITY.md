# VoidCard — Security & Compliance

Production target: `vcard.ed5enterprise.com`. Last reviewed: 2026-05.

This document is the canonical security and compliance plan for VoidCard. It tracks controls, owners, and verification. Aligned with `BUILD_PLAN.md` §15 (Security) and §29 (GDPR/CCPA).

Reporting a vulnerability: `security@ed5enterprise.com` — see `/.well-known/security.txt`. Safe-harbor for good-faith research.

---

## 1. Threat Model (summary)

Assets: user PII (email, name, bio, contact exchange), payment metadata (Stripe handles cards — SAQ-A), shop orders, custom domains, API keys, admin actions, tap analytics.

Top adversaries: opportunistic credential stuffing, spam/abuse on public profile + contact form, scraping, account takeover, malicious custom CSS/HTML XSS, SSRF via webhook delivery, payment fraud, data exfiltration via misconfigured RLS.

Trust boundaries: browser ↔ Next.js (Vercel edge/node) ↔ Supabase Postgres (RLS) ↔ Stripe / Resend / Upstash. Cookie domain `.ed5enterprise.com` shared with ED5 SSO ecosystem.

---

## 2. Phased Plan & Status

Legend: `[ ]` not started · `[~]` in progress · `[x]` done.

### Phase 1 — HTTP hardening
- [x] CSP with per-request nonce (report-only → enforce after 7d soak).
- [x] Strict header set: HSTS preload, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, COOP, CORP.
- [ ] Cookie hygiene audit (Secure, HttpOnly, SameSite=Lax, scoped domain).
- [ ] CSRF double-submit token for cross-subdomain server-action invocations.
- [x] CSP report endpoint `/api/security/csp-report`.

### Phase 2 — AuthN / AuthZ
- [ ] Cloudflare Turnstile on signup / login-after-failures / contact / exchange / password-reset.
- [ ] Password policy (zxcvbn ≥ 3, min 12 chars) via Supabase password hook.
- [ ] TOTP MFA required for `role in ('admin','team_owner')`.
- [ ] Session: idle 24h / absolute 30d; `/account/security` revoke-all.
- [ ] RLS audit pass — pg-prove denial assertions in CI.
- [ ] API key auth: hashed (`sha256`) at rest, plan-scoped rate limits.
- [ ] Audit log entry on every admin action + role/plan/verified changes.

### Phase 3 — Input validation & anti-abuse
- [ ] All server actions / route handlers gated by `zod` schemas.
- [x] Server-side `DOMPurify` on user HTML; allowlist sanitizer for custom CSS.
- [ ] Username / display_name / bio profanity + reserved-list filter.
- [x] Rate-limit expansion (`analyticsTrack`, `auth`, `dsrExport`, `dsrDelete`, `webhook`, `cspReport`).
- [ ] Upload pipeline: server MIME sniff + extension match, `sharp` re-encode (strip EXIF), reject scripted SVG, plan-based size caps.
- [x] SSRF protection on outbound webhook delivery (deny RFC1918, link-local, metadata IPs; HTTPS-only unless verified-badge bonus).
- [x] Open-redirect allowlist for `?next=` / `?return_to=`.

### Phase 4 — Payments & webhooks
- [x] Stripe webhook signature verification (raw body) + replay protection.
- [x] `vcard_stripe_events` idempotency table.
- [x] Server-resolved price IDs only; never trust client.
- [x] PCI scope: SAQ-A (Stripe Checkout / Elements only).

### Phase 5 — Data protection
- [ ] pgcrypto column-level encryption for API keys + pre-share exchange PII.
- [ ] Storage: private buckets default; signed URLs ≤ 1h TTL.
- [x] Daily-rotating IP-hash salt for `vcard_taps` (Redis `vc:tap_salt:YYYYMMDD`).
- [ ] User-Agent stored truncated (browser+OS family only).
- [ ] Geo: country/region only.
- [ ] Secret rotation schedule: Stripe / Supabase service-role 90d; JWT 180d; Resend / Upstash 180d.
- [x] `gitleaks` pre-commit + GitHub push protection.

### Phase 6 — GDPR / CCPA
- [x] `vcard_dsr_log`, `vcard_consent_log`, `vcard_audit_log`, `vcard_stripe_events` (migration `0026`).
- [x] `/account/export` endpoint + Edge Function worker → signed-URL ZIP, 7d TTL, `data-export-ready` email.
- [x] `/account/delete` → 6-digit email confirm → 30d soft-delete window → hard-delete cron → 90d tombstone.
- [x] `/account/data` transparency view.
- [x] Cookie banner (Reject/Accept/Customize), default-deny non-essential, re-prompt at 13mo or version bump.
- [x] Legal pages: `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/dpa`, `/legal/subprocessors`.
- [ ] DPAs signed: Supabase, Stripe, Vercel, Resend, Upstash, PostHog, Sentry, Cloudflare.
- [x] Article 30 ROPA in `docs/legal/ROPA.md`.
- [ ] Min-age self-attest (16 EU / 13 US).

### Phase 7 — Logging, monitoring, IR
- [x] `lib/audit.ts` helper + admin viewer.
- [x] Sentry with `beforeSend` PII scrubber.
- [x] PostHog + Vercel Analytics gated on consent.
- [ ] Vercel Log Drains → S3 (90d retention).
- [ ] Alerts: Sentry spike, Upstash 5xx > 1%, Stripe webhook fail / dispute, Supabase conn > 80%.
- [x] `docs/INCIDENT_RESPONSE.md` runbook + 72h GDPR notification template.
- [ ] Status page `status.vcard.ed5enterprise.com`.
- [x] `/.well-known/security.txt` + repo `SECURITY.md` disclosure policy.

### Phase 8 — Supply chain & CI/CD
- [x] `npm audit --audit-level=high` blocking in CI.
- [x] `osv-scanner` weekly scheduled action.
- [x] `pnpm install --frozen-lockfile`; `packageManager` field enforced.
- [ ] Dependabot weekly; auto-merge patch only.
- [x] GitHub: required PR review, signed commits on `main`, secret scanning + push protection, CodeQL JS/TS workflow.
- [ ] Build provenance via `actions/attest-build-provenance`.

### Phase 9 — Testing
- [ ] Unit: `lib/rate-limit`, `lib/audit`, sanitizers, CSP nonce.
- [ ] Integration: Stripe webhook signature + replay; DSR export correctness.
- [x] Playwright: per gated server action — happy + auth-denied + entitlement-denied.
- [ ] ZAP baseline scan nightly in CI.
- [ ] `pg-prove` RLS denial suite.
- [x] CSP enforced render snapshot.
- [ ] Annual external pen test (pre-launch + yearly).

### Phase 10 — Documentation
- [x] `docs/SECURITY.md` (this file).
- [x] `docs/INCIDENT_RESPONSE.md`.
- [x] `docs/legal/ROPA.md` + per-feature DPIAs.
- [x] Customer-facing `/trust` page.

---

## 3. OWASP Top-10 (2021) Mapping

| OWASP | Control | Evidence |
|---|---|---|
| A01 Broken Access Control | RLS on every `vcard_*` table, `requireUser` / `requireAdmin`, entitlement checks | `lib/auth.ts`, migrations, pg-prove suite |
| A02 Cryptographic Failures | TLS 1.2+, HSTS preload, pgcrypto for sensitive columns, signed URLs | `next.config.ts`, migration `0026` |
| A03 Injection | Supabase param binding, `zod` validators, `DOMPurify`, custom CSS allowlist | `lib/sanitize.ts` |
| A04 Insecure Design | Threat model (this doc), DPIAs, default-deny consent | `/docs/legal/DPIA-*.md` |
| A05 Security Misconfiguration | CSP enforced, headers locked, `poweredByHeader=false` | `next.config.ts`, `middleware.ts` |
| A06 Vulnerable Components | npm audit + osv-scanner + Dependabot + CodeQL | `.github/workflows/security.yml` |
| A07 Auth & Identification | Turnstile, MFA admin, password strength, session TTL | `lib/turnstile.ts`, Supabase hooks |
| A08 Software & Data Integrity | Signed commits, build provenance, lockfile frozen | GitHub branch protection |
| A09 Logging & Monitoring | `vcard_audit_log`, Sentry, log drains, alerts | `lib/audit.ts` |
| A10 SSRF | Webhook delivery IP/scheme allowlist | `lib/webhooks.ts` |

---

## 4. Data Subject Rights (GDPR Art. 15–22 / CCPA)

- **Access / portability**: `/account/export` ZIPs all `vcard_*` rows + storage objects keyed to user; signed URL TTL 7 days; logged in `vcard_dsr_log`.
- **Erasure**: `/account/delete` 6-digit email confirmation → 30-day cancel window → cron hard-delete → 90-day tombstone for legal.
- **Rectification**: in-app edits to profile / sections.
- **Objection / restriction**: pause processing via support ticket; consent revocation flips PostHog flag.
- **Automated decisions**: none.
- **Children**: min age 16 (EU) / 13 (US) self-attest at signup.

---

## 5. Subprocessors

| Vendor | Purpose | Region | DPA |
|---|---|---|---|
| Supabase | Postgres + Auth + Storage | US-East | [ ] |
| Stripe | Payments | US/global | [ ] |
| Vercel | Hosting + edge | global | [ ] |
| Resend | Transactional email | US | [ ] |
| Upstash | Redis (rate-limit, cache) | global | [ ] |
| Cloudflare | Turnstile, DNS | global | [ ] |
| PostHog | Product analytics (consented) | EU | [ ] |
| Sentry | Error monitoring (PII-scrubbed) | EU | [ ] |

Customer-facing copy lives in `/legal/subprocessors`.

---

## 6. Incident Response (summary)

Severity matrix, on-call rotation, comms templates, and 72-hour GDPR regulator notification window are in `docs/INCIDENT_RESPONSE.md` (TBD). Postmortems are blameless and public-facing for SEV-1/2.

---

## 7. Reviews

- Quarterly: RLS audit, secret rotation, vendor list, runbook drill.
- Annually: external pen test, full DPIA refresh, threat model update.
