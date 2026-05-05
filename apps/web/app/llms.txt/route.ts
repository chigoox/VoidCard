import { SITE_URL } from "@/lib/seo";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const body = `# VoidCard
> Onyx-and-gold NFC business cards paired with a living profile that always reflects who you are right now.

VoidCard sells NFC business cards (PVC, metal, custom-art) and pairs each card with a customizable
link-in-bio profile, shop, analytics, wallet pass, embed widget, and contact exchange. Free tier is
powerful (all themes, full custom CSS, 17 section types). Pro ($4.99/mo) adds custom domains, brand
removal, multi-profile, lead forms, API + webhooks, A/B variants, CSV export. Team ($14.99/mo) adds
seats and brand kit.

## Product
- [Home](${SITE_URL}/): What VoidCard is, who it's for.
- [Pricing](${SITE_URL}/pricing): Free vs Pro vs Team. Verified Badge.
- [Shop](${SITE_URL}/shop): Cards, keychains, stickers, bundles, team packs.
- [Why VoidCard](${SITE_URL}/why-voidcard): Comparison vs dotcards.net and Linktree.
- [Changelog](${SITE_URL}/changelog): Recent product updates.

## Docs
- [Public API](${SITE_URL}/docs/api): REST API for profiles, taps, contacts.

## Trust & policies
- [Trust center](${SITE_URL}/trust)
- [Security](${SITE_URL}/legal/security)
- [DPA](${SITE_URL}/legal/dpa)
- [Subprocessors](${SITE_URL}/legal/subprocessors)
- [Cookies](${SITE_URL}/legal/cookies)
- [Privacy](${SITE_URL}/privacy)
- [Terms](${SITE_URL}/terms)
- [AI policy](${SITE_URL}/ai-policy)

## Public profiles
- [Sitemap](${SITE_URL}/sitemap.xml)

## Contact
- [Contact](${SITE_URL}/contact)
`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
