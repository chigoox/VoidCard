# ROPA — Records of Processing Activities (GDPR Art. 30)

Controller: ED5 Enterprise. DPO contact: `dpo@ed5enterprise.com`.
Last reviewed: 2026-05.

## 1. Account & authentication

- **Categories of data subjects:** registered users.
- **Categories of personal data:** email, password hash (Supabase-managed), display name, username, avatar, IP (hashed), user-agent (truncated).
- **Purpose:** authentication, account security, session management.
- **Legal basis:** contract (Art. 6(1)(b)).
- **Retention:** until account deletion + 90-day tombstone.
- **Recipients / subprocessors:** Supabase, Vercel, Resend (transactional email).
- **Transfers:** US (SCCs).
- **Security:** TLS, RLS, MFA for admins, password policy.

## 2. Public profile (`/u/<username>`)

- **Subjects:** users.
- **Data:** name, bio, sections, links, social handles (user-supplied).
- **Purpose:** publish profile chosen by the user.
- **Legal basis:** consent / contract.
- **Retention:** until user deletes profile.

## 3. Tap analytics

- **Subjects:** profile visitors (often anonymous).
- **Data:** hashed IP (daily-rotating salt), country/region, UA family, referrer, profile id, timestamp.
- **Purpose:** product metrics + per-user dashboard.
- **Legal basis:** legitimate interest (Art. 6(1)(f)).
- **Retention:** 13 months, then aggregated only.
- **Notes:** Raw IPs never stored; geo limited to country/region.

## 4. Contact exchange

- **Subjects:** profile owner + scanning visitor.
- **Data:** name, email, phone, organization (visitor-provided).
- **Purpose:** deliver visitor&apos;s contact card to the profile owner; opt-in 2-way exchange.
- **Legal basis:** consent (visitor) + contract (owner).
- **Retention:** until owner deletes lead, max 24 months.

## 5. Shop & subscriptions

- **Subjects:** customers.
- **Data:** email, shipping address, order history; **no card data** (Stripe-handled, PCI SAQ-A).
- **Purpose:** order fulfillment, billing, fraud prevention.
- **Legal basis:** contract + legal obligation (tax records).
- **Retention:** 7 years (tax) for orders; account-linked otherwise.
- **Recipients:** Stripe, fulfillment vendor, Resend.

## 6. Cookie consent

- **Subjects:** all visitors.
- **Data:** anonymous cookie id OR user id, choice JSON, hashed IP, UA, policy version, timestamp.
- **Purpose:** demonstrate consent (ePrivacy + GDPR Art. 7).
- **Legal basis:** legal obligation.
- **Retention:** 5 years.

## 7. Audit log

- **Subjects:** admins + acted-upon users.
- **Data:** actor id, action, target id, diff, hashed IP, UA.
- **Purpose:** security and compliance.
- **Legal basis:** legitimate interest.
- **Retention:** 2 years.

## 8. Error & security telemetry

- **Subjects:** users & visitors.
- **Data:** error stack, scrubbed request context (Sentry `beforeSend` strips email/IP/auth).
- **Purpose:** debugging + abuse detection.
- **Legal basis:** legitimate interest.
- **Retention:** 90 days.

---

## Subprocessors (cross-ref)

See `/legal/subprocessors`. DPAs filed in `/docs/legal/dpas/` (signed copies, not in repo).

## DPIAs

- `DPIA-analytics.md` (TBD): tap analytics legitimate-interest assessment.
- `DPIA-exchange.md` (TBD): contact exchange consent flow.
- `DPIA-custom-domains.md` (TBD): apex domain verification & SSRF posture.
