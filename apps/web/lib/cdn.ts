export function publicAssetUrl(input: string | null | undefined) {
  if (!input) return input ?? null;
  // Rewrite is opt-in: requires BOTH the host and an explicit enabled flag.
  // Setting the host alone (without a working pull-zone) would silently break
  // every uploaded asset, so we require NEXT_PUBLIC_BUNNY_CDN_ENABLED=true.
  const cdnHost = process.env.NEXT_PUBLIC_BUNNY_CDN_HOST;
  const cdnEnabled = process.env.NEXT_PUBLIC_BUNNY_CDN_ENABLED === "true";
  if (!cdnHost || !cdnEnabled) return input;

  try {
    const url = new URL(input);
    const publicPrefix = "/storage/v1/object/public/";
    if (!url.pathname.includes(publicPrefix)) return input;
    url.protocol = "https:";
    url.host = cdnHost;
    return url.toString();
  } catch {
    return input;
  }
}