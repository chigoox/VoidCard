/**
 * Sentry beforeSend hook — strips PII from events before they leave the app.
 *
 * Wire from `sentry.client.config.ts` and `sentry.server.config.ts`:
 *   import { scrubEvent } from "@/lib/sentry-scrub";
 *   Sentry.init({ ..., beforeSend: scrubEvent });
 */

const PII_KEYS = new Set([
  "email", "e-mail", "phone", "phone_number", "ip", "ip_address",
  "address", "street", "postal", "zip",
  "password", "pwd", "token", "access_token", "refresh_token",
  "stripe-signature", "authorization", "cookie", "set-cookie",
  "apikey", "api_key", "x-api-key",
]);

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
const IPV4_RE = /\b(?:\d{1,3}\.){3}\d{1,3}\b/g;
const BEARER_RE = /Bearer\s+[A-Za-z0-9._\-+/=]+/g;

function scrubString(s: string): string {
  return s
    .replace(EMAIL_RE, "[email]")
    .replace(IPV4_RE, "[ip]")
    .replace(BEARER_RE, "Bearer [redacted]");
}

function scrubObject<T>(obj: T, depth = 0): T {
  if (depth > 6 || obj == null) return obj;
  if (typeof obj === "string") return scrubString(obj) as unknown as T;
  if (Array.isArray(obj)) return obj.map((v) => scrubObject(v, depth + 1)) as unknown as T;
  if (typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      if (PII_KEYS.has(k.toLowerCase())) {
        out[k] = "[redacted]";
      } else {
        out[k] = scrubObject(v, depth + 1);
      }
    }
    return out as unknown as T;
  }
  return obj;
}

export function scrubEvent<T>(event: T): T {
  return scrubObject(event);
}
