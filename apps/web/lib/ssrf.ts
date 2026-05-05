import "server-only";

/**
 * SSRF and open-redirect guards.
 *
 * Used by:
 *  - Outbound webhook delivery (vcard_webhooks).
 *  - OAuth/SSO redirects via ?next= / ?return_to=.
 *  - Custom-domain verification fetches (none currently — DNS only).
 */

import { lookup } from "node:dns/promises";

const DENY_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
  "metadata.aws.com",
]);

const DENY_CIDRS: Array<(ip: string) => boolean> = [
  // IPv4 private ranges
  (ip) => /^10\./.test(ip),
  (ip) => /^127\./.test(ip),
  (ip) => /^169\.254\./.test(ip), // link-local + AWS metadata
  (ip) => /^192\.168\./.test(ip),
  (ip) => {
    const m = /^172\.(\d+)\./.exec(ip);
    return !!m && Number(m[1]) >= 16 && Number(m[1]) <= 31;
  },
  (ip) => /^0\./.test(ip),
  (ip) => /^100\.6[4-9]\.|^100\.[7-9]\d\.|^100\.1[01]\d\.|^100\.12[0-7]\./.test(ip), // CGNAT 100.64/10
  // IPv6
  (ip) => ip === "::1",
  (ip) => /^fc/i.test(ip) || /^fd/i.test(ip), // ULA
  (ip) => /^fe80:/i.test(ip), // link-local
  (ip) => /^::ffff:/i.test(ip) && /^::ffff:(10|127|169\.254|192\.168|172\.(1[6-9]|2\d|3[01]))\./i.test(ip),
];

export type WebhookUrlCheck = {
  ok: boolean;
  reason?: string;
};

/**
 * Validate a webhook destination URL. Requires HTTPS unless `allowHttp` is set
 * (used for users with verified-badge bonus, per BUILD_PLAN). Resolves DNS and
 * rejects private/loopback/link-local/metadata addresses.
 */
export async function validateWebhookUrl(
  raw: string,
  opts?: { allowHttp?: boolean },
): Promise<WebhookUrlCheck> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (url.protocol !== "https:" && !(opts?.allowHttp && url.protocol === "http:")) {
    return { ok: false, reason: "https_required" };
  }
  if (DENY_HOSTNAMES.has(url.hostname.toLowerCase())) {
    return { ok: false, reason: "denied_hostname" };
  }
  // Resolve to all addresses; reject if any is denied.
  try {
    const addrs = await lookup(url.hostname, { all: true });
    for (const a of addrs) {
      if (DENY_CIDRS.some((fn) => fn(a.address))) {
        return { ok: false, reason: `denied_address:${a.address}` };
      }
    }
  } catch {
    return { ok: false, reason: "dns_failed" };
  }
  return { ok: true };
}

/**
 * Validate an in-app redirect target (e.g. `?next=/dashboard`). Allows only
 * same-origin paths; rejects protocol-relative, absolute external, and
 * scheme-injection attempts.
 */
export function safeRedirect(target: string | null | undefined, fallback = "/dashboard"): string {
  if (!target || typeof target !== "string") return fallback;
  // Reject protocol-relative and absolute URLs.
  if (target.startsWith("//") || /^[a-z][a-z0-9+.-]*:/i.test(target)) return fallback;
  if (!target.startsWith("/")) return fallback;
  // Disallow path traversal that could exit the app under proxy rewrites.
  if (target.includes("\\")) return fallback;
  return target;
}
