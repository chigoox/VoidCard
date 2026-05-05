export function publicAssetUrl(input: string | null | undefined) {
  if (!input) return input ?? null;
  const cdnHost = process.env.NEXT_PUBLIC_BUNNY_CDN_HOST;
  if (!cdnHost) return input;

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