// NEXT_PUBLIC_BUNNY_CDN_HOST is pasted into hosting dashboards by hand, so it
// can arrive with whitespace, a trailing newline, a scheme or a path. A raw
// newline inside the CSP header made every response fail, so always read the
// host through here.

export const DEFAULT_CDN_HOST = "cdn.vcard.ed5enterprise.com";

/** A bare, lower-case hostname, or null when the value is unset or unusable. */
export function normalizeCdnHost(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const host = raw
    .trim()
    .replace(/^[a-z]+:\/\//i, "")
    .replace(/[/?#].*$/, "")
    .toLowerCase();
  return /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/.test(host) ? host : null;
}

/** The configured CDN host, falling back to the default when unset or invalid. */
export function cdnHost(): string {
  return normalizeCdnHost(process.env.NEXT_PUBLIC_BUNNY_CDN_HOST) ?? DEFAULT_CDN_HOST;
}
