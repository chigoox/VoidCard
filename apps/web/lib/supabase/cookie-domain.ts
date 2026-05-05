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

export function getCookieDomain(fallback?: string) {
  return sanitizeCookieDomain(
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN ?? process.env.SUPABASE_COOKIE_DOMAIN ?? fallback
  );
}