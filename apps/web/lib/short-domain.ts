// The link shortener's own domain (ed5z.com). Requests on it are short-link
// redirects, never profiles or custom domains.
import { normalizeCdnHost } from "./cdn-host";

export const DEFAULT_SHORT_HOST = "ed5z.com";
/** Codes the shortener issues: lower-case letters, digits and dashes. */
export const SHORT_CODE = /^[a-z0-9-]{3,32}$/;

/** Bare short-link host, cleaned of whitespace/scheme/path; default when unset or invalid. */
export function shortHost(raw: string | null | undefined = process.env.NEXT_PUBLIC_SHORT_DOMAIN): string {
  return normalizeCdnHost(raw) ?? DEFAULT_SHORT_HOST;
}

/** True for the short host and its www. alias. */
export function isShortHost(host: string, raw?: string | null): boolean {
  const short = shortHost(raw);
  return host === short || host === `www.${short}`;
}

/** Path prefix for links on the short host: ed5z.com/l/<code>. */
export const SHORT_PATH_PREFIX = "/l/";

/** Public URL for a short code, e.g. https://ed5z.com/l/abc123. */
export function shortUrl(code: string, raw?: string | null): string {
  return `https://${shortHost(raw)}${SHORT_PATH_PREFIX}${code}`;
}

/**
 * Where a request on the short host goes: /l/<code> to the redirect route,
 * anything else back to the main site.
 */
export function routeShortHostPath(pathname: string): { kind: "code"; code: string } | { kind: "site" } {
  const match = /^\/l\/([^/]+)\/?$/i.exec(pathname);
  const code = match?.[1]?.toLowerCase() ?? "";
  return SHORT_CODE.test(code) ? { kind: "code", code } : { kind: "site" };
}
