function sanitizeCookieDomain(value: string | null | undefined) {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  const withoutProtocol = trimmed.replace(/^https?:\/\//i, "");
  const host = withoutProtocol.split("/")[0]?.replace(/:\d+$/, "");
  if (!host) return undefined;

  const normalized = host.replace(/^\.+/, "");
  return normalized || undefined;
}

function resolveCurrentHost(currentHost?: string | null) {
  if (currentHost) return sanitizeCookieDomain(currentHost);
  if (typeof window !== "undefined") return sanitizeCookieDomain(window.location.hostname);
  return undefined;
}

function hostCanShareCookie(host: string | undefined, domain: string) {
  if (!host) return true;
  if (host === "localhost" || host === "127.0.0.1") return false;
  return host === domain || host.endsWith(`.${domain}`);
}

export function getCookieDomain(fallback?: string, currentHost?: string | null) {
  const configuredDomain = sanitizeCookieDomain(
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? process.env.SUPABASE_COOKIE_DOMAIN ?? fallback,
  );

  if (!configuredDomain) return undefined;

  const host = resolveCurrentHost(currentHost);
  return hostCanShareCookie(host, configuredDomain) ? configuredDomain : undefined;
}