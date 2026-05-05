# Incident Response Runbook — VoidCard

Owner: Security lead. Reviewed quarterly. Last review: 2026-05.

## Severity matrix

| Sev | Definition | Examples | First response |
|---|---|---|---|
| SEV-1 | Customer data exposed, payments broken, or full outage | RLS bypass, public S3 leak, Stripe webhook down | < 15 min, page on-call |
| SEV-2 | Major feature degraded | Auth failure rate > 5%, profile pages 5xx | < 30 min |
| SEV-3 | Minor degradation | Single endpoint slow, dashboard widget broken | < 4 h |
| SEV-4 | Cosmetic / single-user | Typo, layout glitch | next business day |

## On-call

- Primary: Security lead (rotation TBD).
- Backup: Engineering lead.
- Escalation: CEO for SEV-1 within 30 min.
- Channel: `#vc-incidents` (Slack/Discord) + PagerDuty.

## Response phases

### 1. Detect
Triggers: Sentry alert, Upstash 5xx, Stripe webhook failure, Supabase connections, customer report (`security@ed5enterprise.com`), social-media mention.

### 2. Triage (10 min)
- Open incident channel `#inc-YYYYMMDD-<slug>`.
- Assign Incident Commander (IC), Comms, Scribe.
- Set severity. Confirm scope: data-exposure? auth? payments? availability?

### 3. Contain
- If credential leaked: rotate immediately (Stripe, Supabase service-role, JWT, Resend, Upstash).
- If RLS bypass suspected: revoke service-role key, freeze writes via feature flag.
- If active attack: block IP at Vercel WAF + Cloudflare.
- Snapshot DB (Supabase point-in-time) before remediation.

### 4. Eradicate / recover
- Roll forward fix in a branch; deploy via emergency PR (single review for SEV-1).
- Verify with synthetic check + targeted Playwright spec.
- Restore from PITR if data integrity compromised (RTO 4h / RPO 1h).

### 5. Notify

| Audience | Trigger | Channel | Window |
|---|---|---|---|
| Affected users | Personal data exposure | Email + in-app banner | within 72h (GDPR Art. 33/34) |
| Regulators (ICO/CNIL/etc.) | Personal data breach with risk | Email + portal | within 72h |
| Stripe | Card data implicated | <support@stripe.com> | immediately |
| Customers (B2B w/ DPA) | Per DPA §6 | Email | without undue delay |
| Public | SEV-1 affecting >1% of users | Status page + tweet | within 1h |

Templates in `/docs/legal/breach-templates/` (TBD).

### 6. Postmortem
- Blameless. Published within 5 business days for SEV-1/2.
- Sections: timeline, contributing factors, what went well, action items (with owners + due dates).
- File at `/docs/postmortems/YYYY-MM-DD-<slug>.md`.

## Useful commands

```powershell
# Rotate Supabase service-role key (in Supabase dashboard → Settings → API).
# Update Vercel env: SUPABASE_SERVICE_ROLE_KEY → redeploy.

# PITR restore window (Supabase dashboard → Database → Backups).
# Restore to a new project, then dump → restore selected tables.

# Block IP at edge (vercel firewall).
# Or via middleware feature flag if dashboard is unavailable.
```

## Drills

Quarterly tabletop exercise. Annual full restore drill. Track in `/docs/drills/`.
