import "server-only";

/**
 * Content-Security-Policy builder for VoidCard.
 *
 * Used by proxy.ts to inject a per-request nonce into a Response header
 * so that <Script nonce={...} /> and inline boot scripts can execute under a
 * strict CSP without `'unsafe-inline'` for scripts.
 *
 * Style still allows 'unsafe-inline' because Tailwind/Next inject runtime
 * style attributes; we tighten this in a later phase via hashed styles.
 */

export type CspMode = "report-only" | "enforce";

const PROD = process.env.NODE_ENV === "production";

/** Generate a 128-bit base64 nonce safe for CSP. */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  // base64 (atob/btoa not in Edge runtime reliably for binary; manual encode)
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]!);
  return typeof btoa === "function" ? btoa(bin) : Buffer.from(bin, "binary").toString("base64");
}

/**
 * Build the CSP header value. Keep this in sync with vendor scripts loaded by
 * the app (Stripe, Turnstile, PostHog, Sentry, Supabase realtime).
 */
export function buildCsp(nonce: string): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'self'"],
    "form-action": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "https://js.stripe.com",
      "https://challenges.cloudflare.com",
      "https://*.posthog.com",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://connect.facebook.net",
      // Vercel injects analytics from these origins.
      "https://va.vercel-scripts.com",
      // Allow eval only in dev for Next.js HMR.
      ...(PROD ? [] : ["'unsafe-eval'"]),
    ],
    "script-src-elem": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "https://js.stripe.com",
      "https://challenges.cloudflare.com",
      "https://*.posthog.com",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://connect.facebook.net",
      "https://va.vercel-scripts.com",
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "style-src-elem": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "data:", "https://fonts.gstatic.com"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://*.supabase.co",
      "https://*.stripe.com",
      "https://lh3.googleusercontent.com",
      "https://avatars.githubusercontent.com",
      "https://www.facebook.com",
      "https://www.google-analytics.com",
    ],
    "media-src": ["'self'", "blob:", "https://*.supabase.co"],
    "connect-src": [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://api.stripe.com",
      "https://*.upstash.io",
      "https://*.posthog.com",
      "https://*.sentry.io",
      "https://www.googletagmanager.com",
      "https://www.google-analytics.com",
      "https://region1.google-analytics.com",
      "https://connect.facebook.net",
      "https://www.facebook.com",
      "https://va.vercel-scripts.com",
      "https://challenges.cloudflare.com",
    ],
    "frame-src": [
      "'self'",
      "https://js.stripe.com",
      "https://hooks.stripe.com",
      "https://challenges.cloudflare.com",
    ],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "report-uri": ["/api/security/csp-report"],
    "report-to": ["csp-endpoint"],
  };

  if (PROD) directives["upgrade-insecure-requests"] = [];

  return Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");
}

/**
 * Reporting-API endpoint group. Set as a separate header.
 */
export const REPORT_TO_HEADER = JSON.stringify({
  group: "csp-endpoint",
  max_age: 10886400,
  endpoints: [{ url: "/api/security/csp-report" }],
});

/**
 * Header name based on phase. Start in report-only and flip after soak.
 */
export function cspHeaderName(mode: CspMode = (process.env.CSP_MODE as CspMode) ?? "report-only"): string {
  return mode === "enforce" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only";
}
