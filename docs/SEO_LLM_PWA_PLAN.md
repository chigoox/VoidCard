# VoidCard — SEO + LLM + PWA Plan (apps/web)

**Status:** Authoritative plan for the Next.js 16 App Router target at `apps/web/`. Supersedes `docs/PWA_SEO_UPGRADE_PLAN.md` (which targeted the legacy Vite app at the repo root). Cross-references `BUILD_PLAN.md` §5 (PWA), §6 (SEO), §37 (sitemap), §38 (perf).

**Production host:** `https://vcard.ed5enterprise.com`
**Short-link host:** `https://vc.ed5e.co`
**Brand voice:** Onyx Gold — dark, premium, calm.

---

## 0. KPI gates (CI must enforce)

| Surface                       | Lighthouse mobile (Perf / SEO / Best / A11y / PWA) | LCP    | INP    | CLS    |
| ----------------------------- | -------------------------------------------------- | ------ | ------ | ------ |
| `/` (marketing)               | ≥ 95 / 100 / 100 / 100 / ≥ 90                      | < 2.0s | < 200ms | < 0.05 |
| `/u/[username]` (public)      | ≥ 95 / 100 / 100 / ≥ 95 / ≥ 90                     | < 2.5s | < 200ms | < 0.10 |
| `/shop`, `/shop/[slug]`       | ≥ 90 / 100 / 100 / ≥ 95 / ≥ 90                     | < 2.5s | < 200ms | < 0.10 |
| `/(app)/*` (authed dashboard) | ≥ 85 / N/A / 100 / ≥ 95 / ≥ 90                     | < 2.5s | < 200ms | < 0.10 |

Bundle budget (`size-limit` in CI):
- `chunks/u-*.js` ≤ 70 KB
- `chunks/dashboard-*.js` ≤ 200 KB
- shared first-load JS ≤ 130 KB

---

## 1. SEO foundation (Next.js App Router)

### 1.1 File map (must exist)

```
apps/web/app/
  layout.tsx                    # root metadata + viewport (DONE)
  manifest.ts                   # MetadataRoute.Manifest      ← create
  robots.ts                     # MetadataRoute.Robots        ← create
  sitemap.ts                    # index → child sitemap routes ← create
  sitemap/
    profiles/[page]/sitemap.ts  # paginated, ≤5000 URLs each  ← create
    shop/sitemap.ts             # public products             ← create
    static/sitemap.ts           # marketing pages             ← create
  llms.txt/route.ts             # AI crawler directives       ← create (§2)
  llms-full.txt/route.ts        # full content map for LLMs   ← create (§2)
  ai.txt/route.ts               # alias for legacy clients    ← create (§2)
  .well-known/
    ai-plugin.json/route.ts     # OpenAI plugin descriptor    ← create (§2)
    security.txt/route.ts                                     ← create
  opengraph-image.tsx           # site-wide OG fallback       ← create
  twitter-image.tsx             # site-wide Twitter fallback  ← create
  icon.tsx                      # 32x32 generated favicon     ← create
  apple-icon.tsx                # 180x180                     ← create
  u/[username]/
    opengraph-image.tsx         # dynamic per-profile OG      ← create
    twitter-image.tsx                                         ← create
    page.tsx                    # generateMetadata + JSON-LD  (DONE base, expand)
  shop/
    opengraph-image.tsx                                       ← create
    [slug]/opengraph-image.tsx                                ← create
  offline/page.tsx              # SW fallback                 ← create
  sw.ts                         # Serwist service worker      ← create

apps/web/lib/
  seo.ts                        # buildMetadata helper        ← create
  jsonld.ts                     # typed schema.org builders   ← create
  llms.ts                       # LLM crawler detection + content shaping ← create

apps/web/public/
  og-default.png                # 1200x630 brand OG (used by layout) ← add
  splash/*.png                  # iOS PWA splash (12 sizes)         ← add via pwa-asset-generator
  icons/icon-{192,512,maskable-192,maskable-512}.png                ← add
```

### 1.2 `lib/seo.ts` — single metadata builder

```ts
// apps/web/lib/seo.ts
import type { Metadata } from "next";

export type SeoInput = {
  title: string;
  description: string;
  path: string;                 // canonical path, e.g. "/u/zane"
  image?: string;               // absolute or path; falls back to /og-default.png
  noindex?: boolean;
  type?: "website" | "article" | "profile" | "product";
  keywords?: string[];
  publishedAt?: string;         // ISO
  modifiedAt?: string;          // ISO
  authorName?: string;
};

const SITE = "https://vcard.ed5enterprise.com";

export function buildMetadata(i: SeoInput): Metadata {
  const url = new URL(i.path, SITE).toString();
  const image = i.image
    ? (i.image.startsWith("http") ? i.image : new URL(i.image, SITE).toString())
    : `${SITE}/og-default.png`;

  return {
    title: i.title,
    description: i.description,
    keywords: i.keywords,
    alternates: { canonical: url },
    robots: i.noindex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true, googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 } },
    openGraph: {
      type: i.type ?? "website",
      url,
      title: i.title,
      description: i.description,
      siteName: "VoidCard",
      images: [{ url: image, width: 1200, height: 630, alt: i.title }],
      ...(i.publishedAt && { publishedTime: i.publishedAt }),
      ...(i.modifiedAt && { modifiedTime: i.modifiedAt }),
    },
    twitter: {
      card: "summary_large_image",
      title: i.title,
      description: i.description,
      images: [image],
    },
  };
}
```

Every public route calls `buildMetadata(...)`. Authed dashboard routes export `metadata = { robots: { index: false, follow: false } }`.

### 1.3 `app/robots.ts`

```ts
import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const SITE = "https://vcard.ed5enterprise.com";
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/(app)", "/auth", "/exchange/", "/c/", "/s/"] },
      // Allow LLM crawlers explicitly (decision recorded in §2)
      { userAgent: ["GPTBot", "OAI-SearchBot", "ChatGPT-User", "PerplexityBot", "ClaudeBot", "Claude-Web", "anthropic-ai", "Google-Extended", "CCBot", "Applebot-Extended", "Bytespider", "DuckAssistBot"], allow: "/u/", disallow: ["/admin", "/api", "/(app)", "/auth"] },
    ],
    sitemap: [`${SITE}/sitemap.xml`],
    host: SITE,
  };
}
```

### 1.4 `app/sitemap.ts` (index) + paginated children

- Root `sitemap.ts` returns the `<sitemapindex>` listing each child sitemap route.
- `app/sitemap/profiles/[page]/sitemap.ts` queries `vcard_profile_ext where is_public=true and is_password_protected=false and is_indexable=true` ordered by `updated_at desc`, page size 5000.
- `app/sitemap/shop/sitemap.ts` lists active products from `vcard_products`.
- `app/sitemap/static/sitemap.ts` lists `/`, `/pricing`, `/shop`, `/changelog`, `/contact`, `/privacy`, `/terms`, `/docs`, `/try`.

`generateSitemaps()` returns the page count for profiles, computed from `count(*)`.

### 1.5 Per-route `generateMetadata`

Routes that MUST implement (most already exist as files — add metadata):

| Route                     | Title pattern                          | OG image                              | JSON-LD            |
| ------------------------- | -------------------------------------- | ------------------------------------- | ------------------ |
| `/`                       | static                                 | static                                | Organization, WebSite, FAQPage |
| `/pricing`                | static                                 | static                                | Product (Pro, Team), FAQPage |
| `/shop`                   | static                                 | static                                | ItemList, BreadcrumbList |
| `/shop/[slug]`            | "{product} · VoidCard Shop"            | dynamic (product render)              | Product + AggregateRating (when ≥1 review) |
| `/u/[username]`           | "{display_name} (@{username})"         | dynamic ImageResponse                 | Person + WebSite + (optional) Organization |
| `/exchange/[token]`       | "Save {name} to your contacts"         | dynamic (vCard preview)               | none (noindex)     |
| `/changelog`              | static                                 | static                                | Article (latest entry) |
| `/docs/[slug]`            | "{doc title} · VoidCard"               | static                                | TechArticle + BreadcrumbList |
| `/contact`, `/privacy`, `/terms` | static                          | static                                | BreadcrumbList     |
| `/(app)/*`                | "{page} · VoidCard"                    | none                                  | noindex            |

### 1.6 JSON-LD (`lib/jsonld.ts`)

Typed builders that return `<script type="application/ld+json" dangerouslySetInnerHTML>` markup. Schemas in v1:

- **Organization** (root layout, all pages): legalName, url, logo, sameAs[]
- **WebSite** with `SearchAction` pointing to `/search?q={search_term_string}`
- **Person** (every public profile): name, alternateName=`@username`, url, image, jobTitle, worksFor.@type=Organization, sameAs[] (links from `vcard_profile_ext.links`), knowsAbout (from skills/sections)
- **Product** + **Offer** (shop product detail): price, priceCurrency=USD, availability, sku, brand=VoidCard, image[]
- **AggregateRating** (when ≥1 review on product)
- **Review** (per review row, embed in Product)
- **BreadcrumbList** (shop, docs)
- **FAQPage** (`/`, `/pricing` — Q/A from CMS)
- **ItemList** (shop index, public directory)
- **TechArticle** (docs)
- **Event** (shop drops with start_date)

### 1.7 OG / Twitter images (Edge ImageResponse)

`app/u/[username]/opengraph-image.tsx`:

```ts
import { ImageResponse } from "next/og";
export const runtime = "edge";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function og({ params }: { params: { username: string } }) {
  const profile = await fetchPublicProfile(params.username); // server util, public read
  if (!profile) return new ImageResponse(<NotFoundCard />, size);
  return new ImageResponse(
    <ProfileOG name={profile.display_name} handle={profile.username} avatar={profile.avatar_url} accent={profile.theme_accent} verified={profile.is_verified} />,
    { ...size, headers: { "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800" } }
  );
}
```

Edge cache OG renders 24h; bust on profile update via `revalidateTag("profile-og:" + username)`.

### 1.8 Canonical / hreflang / pagination hygiene

- Canonical URL on every page (set by `buildMetadata`).
- No trailing slashes (`next.config.ts` `trailingSlash: false` — default).
- Custom-domain-served profiles: canonical points back to `vcard.ed5enterprise.com/u/[username]` UNLESS user enabled "primary canonical = custom domain" toggle (Pro feature).
- Pagination on `/changelog`, `/docs`, directory: emit `rel="prev"/"next"` via `<link>` + `?page=` canonicals.
- Soft-deleted username → HTTP 410 + `noindex` (BUILD_PLAN §37).

### 1.9 Internal linking and IA

- Public profile renders a `Person` schema and a footer link "Made with VoidCard" (removable on Pro). Free tier passes link equity to root domain.
- Sitewide breadcrumbs in shop + docs.
- Footer mega-link block on `/`, `/pricing`, `/shop`: links to all public marketing routes (helps crawl budget).

---

## 2. LLM / Answer-engine optimization (AEO/GEO)

Goal: be a first-class citizen for LLM-powered search (ChatGPT Search, Perplexity, Claude, Gemini, You, Bing Copilot, Apple Intelligence) while keeping authoritative control over training/retrieval consent.

### 2.1 Crawler policy (decision matrix)

| Bot                            | Use case             | Allow `/u/*`? | Allow training? |
| ------------------------------ | -------------------- | :-----------: | :-------------: |
| `GPTBot`                       | OpenAI training      |       ❌      |        ❌       |
| `OAI-SearchBot`                | ChatGPT Search index |       ✅      |        ❌       |
| `ChatGPT-User`                 | On-demand fetch      |       ✅      |        N/A      |
| `Google-Extended`              | Gemini training      |       ❌      |        ❌       |
| `Googlebot`                    | Google Search        |       ✅      |        N/A      |
| `Applebot`                     | Spotlight/Siri       |       ✅      |        N/A      |
| `Applebot-Extended`            | Apple Intelligence   |       ✅      |        ❌       |
| `PerplexityBot`                | Perplexity index     |       ✅      |        N/A      |
| `ClaudeBot`/`anthropic-ai`     | Anthropic training   |       ❌      |        ❌       |
| `Claude-Web`                   | On-demand fetch      |       ✅      |        N/A      |
| `CCBot` (Common Crawl)         | training corpus      |       ❌      |        ❌       |
| `Bytespider`                   | ByteDance / Doubao   |       ✅      |        ❌       |
| `DuckAssistBot`                | Duck.ai answers      |       ✅      |        N/A      |

Per-user override: `vcard_profile_ext.ai_indexing` enum `{allow_search_only, allow_all, disallow_all}` (default `allow_search_only`). When `disallow_all`, public profile injects `<meta name="robots" content="noai, noimageai">` and `X-Robots-Tag: noai, noimageai` header from `middleware.ts`. (Migration 0026.)

### 2.2 `app/llms.txt/route.ts`

Serves the [llms.txt](https://llmstxt.org) standard at `/llms.txt`. Markdown index of the most useful URLs for LLM consumption.

```ts
export const runtime = "edge";
export async function GET() {
  const body = `# VoidCard
> Onyx-and-gold NFC business cards paired with a living link-in-bio profile.

## Product
- [Pricing](https://vcard.ed5enterprise.com/pricing): Free / Pro $4.99/mo / Team $14.99/mo
- [Shop](https://vcard.ed5enterprise.com/shop): NFC cards, metal cards, bundles
- [Changelog](https://vcard.ed5enterprise.com/changelog)

## Docs
- [Getting started](https://vcard.ed5enterprise.com/docs/getting-started)
- [Page builder](https://vcard.ed5enterprise.com/docs/page-builder)
- [Custom domains (Pro)](https://vcard.ed5enterprise.com/docs/custom-domains)
- [Public API](https://vcard.ed5enterprise.com/docs/api)

## Public profiles
- [Featured directory](https://vcard.ed5enterprise.com/directory)

## Policies
- [AI policy](https://vcard.ed5enterprise.com/ai-policy)
- [Privacy](https://vcard.ed5enterprise.com/privacy)
- [Terms](https://vcard.ed5enterprise.com/terms)
`;
  return new Response(body, { headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "public, max-age=3600" } });
}
```

`/llms-full.txt` mirrors `llms.txt` but inlines the rendered markdown of every doc page (built at request time from the docs CMS, edge-cached 1h). Token-efficient: stripped of boilerplate, no nav, no JS.

`/ai.txt` = redirect to `/llms.txt` (legacy clients).

### 2.3 `.well-known/ai-plugin.json`

Optional but cheap. Describes a read-only API surface (`/api/public/v1/profile/{username}`) for plugin/MCP-style clients. Schema: OpenAPI 3.1 at `/openapi.json`.

### 2.4 LLM-friendly content shape (per-page rules)

Every public page must include, in this order, **inside the first 1500 rendered characters**:

1. A single H1 with the entity's primary name.
2. A 1–2 sentence summary in a `<p data-llm="summary">`.
3. Key facts as a definition list (`<dl>`) or compact `<ul>` — title, location, role, primary CTA URL.
4. JSON-LD block (Organization / Person / Product) emitted server-side (no client hydration required).

Rationale: LLMs over-weight early content. Avoid hiding facts behind tabs/accordions.

### 2.5 Public profile LLM payload

`/u/[username]` SSR HTML must contain (in addition to the visual page):

- `<meta name="description">` ≤ 160 chars: "{display_name} — {role at company}. {one-line bio}."
- A `<section aria-label="Profile summary" data-llm="primary">` with bio + role + primary links (text, not just icons).
- `application/ld+json` Person schema (§1.6).
- A `<noscript>` with the same content (defends against headless retrievers that don't run JS).
- HTTP `Link: </u/${username}/data.json>; rel="alternate"; type="application/json"` for structured retrieval.

Add `app/u/[username]/data.json/route.ts` returning a stable JSON shape (versioned via `?v=1`). Cached 60s edge, public.

### 2.6 Content freshness signals

- `Last-Modified` and `ETag` headers on profile + product responses (driven by `updated_at`).
- `dateModified` in JSON-LD.
- Sitemap `<lastmod>` accurate.
- RSS feed at `/changelog/feed.xml` (Atom). LLMs use feeds for delta crawls.

### 2.7 Anti-hallucination measures

- Avoid template strings that look like fake data (no "John Doe" placeholders in SSR output).
- 404 / suspended usernames return 410 with explicit copy "Profile no longer available" + `noindex`.
- Verified badge surfaces in JSON-LD `Person.identifier` with `propertyID: "VoidCard Verified"` so answer engines can cite trust.

### 2.8 `/ai-policy` page (public)

A short human + machine-readable page stating training/retrieval permissions. Linked from `llms.txt` and footer. Versioned in `vcard_cms`.

---

## 3. PWA enablement

### 3.1 `app/manifest.ts`

```ts
import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?source=pwa",
    name: "VoidCard",
    short_name: "VoidCard",
    description: "NFC business cards + living profiles.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    categories: ["business", "productivity", "social"],
    lang: "en",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-192.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icons/monochrome.svg", sizes: "any", type: "image/svg+xml", purpose: "monochrome" },
    ],
    shortcuts: [
      { name: "My profile", url: "/(app)/profile", icons: [{ src: "/icons/sc-profile.png", sizes: "96x96" }] },
      { name: "Insights", url: "/(app)/insights" },
      { name: "Shop", url: "/shop" },
      { name: "Scan card", url: "/(app)/pair" },
    ],
    share_target: {
      action: "/(app)/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: { title: "title", text: "text", url: "url", files: [{ name: "file", accept: ["image/*", "text/vcard"] }] },
    },
    protocol_handlers: [{ protocol: "web+voidcard", url: "/u/%s" }],
    prefer_related_applications: false,
    edge_side_panel: { preferred_width: 400 },
  };
}
```

iOS splash screens (12 sizes) generated via `pwa-asset-generator` written into `public/splash/`, registered with `<link rel="apple-touch-startup-image">` injected from `app/layout.tsx`.

### 3.2 `app/sw.ts` (Serwist)

```ts
import { defaultCache } from "@serwist/next/worker";
import { Serwist } from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    // Public profiles: stale-while-revalidate (1h)
    { matcher: ({ url }) => url.pathname.startsWith("/u/"), handler: "StaleWhileRevalidate", options: { cacheName: "profiles", expiration: { maxEntries: 200, maxAgeSeconds: 3600 } } },
    // OG images: cache 24h
    { matcher: ({ request }) => request.destination === "image" && request.url.includes("opengraph-image"), handler: "CacheFirst", options: { cacheName: "og", expiration: { maxEntries: 100, maxAgeSeconds: 86400 } } },
    // Static media: cache-first (30d)
    { matcher: ({ request }) => ["image", "font", "style"].includes(request.destination), handler: "CacheFirst", options: { cacheName: "static", expiration: { maxEntries: 300, maxAgeSeconds: 2592000 } } },
    // API: network-first (5s timeout) — never cache /api/auth, /api/stripe
    { matcher: ({ url }) => url.pathname.startsWith("/api/") && !["/api/auth", "/api/stripe", "/api/admin"].some(p => url.pathname.startsWith(p)), handler: "NetworkFirst", options: { cacheName: "api", networkTimeoutSeconds: 5, expiration: { maxEntries: 50, maxAgeSeconds: 300 } } },
    ...defaultCache,
  ],
  fallbacks: { entries: [{ url: "/offline", matcher: ({ request }) => request.destination === "document" }] },
});
serwist.addEventListeners();
```

Excluded from SW (never cached): `/api/auth/*`, `/api/stripe/*`, `/api/admin/*`, `/auth/*`, `/(app)/billing*`. Enforced both in `runtimeCaching` matchers and via `Cache-Control: no-store` headers on those routes.

### 3.3 `app/offline/page.tsx`

Branded onyx page with "You're offline" + cached-content list (recently viewed profiles via IndexedDB).

### 3.4 Install + update UX

`components/pwa/InstallPrompt.tsx` (client):
- Captures `beforeinstallprompt`, defers, shows a glass-card prompt on `/` after 30s + on dashboard after 2 visits.
- Tracks events: `pwa_install_offered`, `pwa_install_accepted`, `pwa_install_dismissed` (PostHog).

`components/pwa/UpdateToast.tsx` (client):
- Listens to `serwist`'s `controllerchange` / `waiting` events.
- Toast: "New version available — Reload" with countdown.

iOS-only Add-to-Home-Screen helper (since no `beforeinstallprompt`): detect iOS Safari, show one-time bottom sheet with the share→add-to-home-screen instructions.

### 3.5 Native-feel polish

- `viewport-fit=cover` (DONE in layout).
- `<meta name="apple-mobile-web-app-capable" content="yes">` via `appleWebApp` in metadata (DONE).
- Safe-area CSS env vars in `globals.css` (`pt-[env(safe-area-inset-top)]` etc.).
- Bottom nav uses `position: fixed` with safe-area padding.
- Disable text-size adjust, tap highlight, overscroll on app shell.
- File handlers for `.vcf` open `/(app)/contacts/import`.

### 3.6 Push notifications (deferred to v1.1)

Schema reservations: `vcard_push_subscriptions(user_id, endpoint, p256dh, auth, ua, created_at)`. Web Push via `web-push` lib + VAPID keys in env. Out of scope for launch.

---

## 4. Performance hardening (LCP/INP/CLS)

### 4.1 Rendering strategy per route

| Route                   | Mode                              | Cache                                                  |
| ----------------------- | --------------------------------- | ------------------------------------------------------ |
| `/`                     | Static                            | `revalidate = 3600`                                    |
| `/pricing`, `/changelog`, `/docs/[slug]` | ISR              | `revalidate = 600`                                     |
| `/shop`, `/shop/[slug]` | ISR + tag revalidate              | `revalidateTag("shop")`, `revalidateTag("product:" + sku)` |
| `/u/[username]`         | Edge SSR + Upstash read-through    | 60s TTL, tag `profile:{id}`                           |
| `/c/[id]`, `/s/[slug]`  | Edge route handler → 308 redirect | 30s TTL                                                |
| `/(app)/*`              | Dynamic, no cache                 | n/a                                                    |
| OG images               | Edge ImageResponse                 | `s-maxage=86400, swr=604800`                          |

### 4.2 Image pipeline

- All raster art via `next/image`. `<img>` is lint-banned (`@next/next/no-img-element` error).
- Avatars: Supabase Storage URL → `loader` that appends `?width=…&quality=80` (Supabase Image Transform).
- LCP avatar gets `priority` + `fetchPriority="high"` + a Blurhash placeholder (`plaiceholder` at upload time, stored in `vcard_media.blurhash`).
- AVIF + WebP, fallback JPG.
- All `<Image>` requires explicit `width` + `height` (CLS).

### 4.3 Font loading

- `next/font/google` with `display: swap` (DONE).
- Subset to `latin` only at launch.
- Preload `font-fraunces` weight 600 only (the H1 weight) — variable font with single weight subset.

### 4.4 Code splitting

- Route segments are auto-split. Heavy editors (`Section editor`, `Theme editor`) are dynamic-imported with `ssr: false` and Suspense skeletons.
- recharts is dynamic-imported on the Insights page.
- No barrel files in `lib/` or `components/` (kills tree-shaking).

### 4.5 Third-party hygiene

- Vercel Analytics (in layout). PostHog loaded **after** idle via `posthog-js/lazy`.
- Stripe.js only loaded on `/checkout` and `/account/billing`.
- No Google Tag Manager. No Hotjar.

### 4.6 HTTP caching headers

Augment `next.config.ts` `headers()`:
- `/_next/static/*` already immutable (Next default).
- `/og-default.png`, `/icons/*`: `public, max-age=31536000, immutable`.
- `/manifest.webmanifest`: `public, max-age=86400`.
- `/sitemap*.xml`, `/robots.txt`, `/llms.txt`: `public, max-age=3600`.
- `/sw.js`: `public, max-age=0, must-revalidate` (Serwist already does this).

### 4.7 Edge cache layer

Upstash Redis read-through for:
- `profile:{username}` payload (60s TTL, negative cache 10s).
- `shortlink:{slug}` (5min).
- `product:{sku}` (5min).

Cache key includes a per-user `etag` bumped on every write — avoids stampedes.

---

## 5. Accessibility (gates SEO)

- Every page: skip-link, single H1, landmark roles, focus ring.
- Color contrast: AA min 4.5:1 (Onyx Gold tokens already pass; verify in tests).
- All interactive controls reachable by keyboard, visible focus (`focus-visible`).
- `aria-current` on bottom nav.
- Reduced-motion respected for hero glow + section transitions.
- Playwright `@axe-core/playwright` audit on `/`, `/u/[seed]`, `/shop`, `/pricing` — zero serious/critical violations.

---

## 6. Observability

- **Vercel Speed Insights** (RUM) enabled via `<SpeedInsights/>` in layout.
- **Sentry**: capture web vitals + soft 404s.
- **PostHog** funnels for SEO referrals (`utm_*`) and AI referrals (`utm_source=chatgpt|perplexity|claude|gemini` plus `Referer` allow-list).
- **Search Console** + **Bing Webmaster** verified via DNS TXT + meta tag fallback.
- **PWA Insights**: `pwa_install_*`, `pwa_offline_navigation`, `pwa_update_applied`.
- Weekly Slack digest: top crawl errors, indexed-page delta, LCP p75 delta.

---

## 7. Testing

Playwright specs (`apps/web/e2e/`):

- `seo.spec.ts`: every public route returns `<title>`, `<meta name=description>`, canonical, OG image, JSON-LD parses with valid schema.
- `seo-noindex.spec.ts`: every `/(app)/*` and `/auth/*` route emits noindex.
- `sitemap.spec.ts`: `/sitemap.xml` is valid XML, points to existing children, every URL responds 200/410.
- `robots.spec.ts`: `/robots.txt` parses, includes sitemap, AI rules present.
- `llms.spec.ts`: `/llms.txt`, `/llms-full.txt`, `/ai-policy` return 200 with expected sections.
- `pwa-manifest.spec.ts`: manifest valid against W3C schema, icons resolve.
- `pwa-offline.spec.ts`: install SW, go offline, navigate to `/` and a recently-viewed `/u/x`, verify offline page + cached content.
- `pwa-update.spec.ts`: simulate new SW, expect update toast.
- `lighthouse.spec.ts`: run `playwright-lighthouse` on the matrix in §0; fail under thresholds.
- `axe.spec.ts`: zero serious/critical violations on key pages.
- `og.spec.ts`: dynamic OG image returns 1200×630 PNG with `image/png` mime and a brand-color pixel sampled.

CI:
- `lhci` GitHub Action for Lighthouse CI on every PR (mobile preset, 3 runs median).
- `size-limit` check.
- `pa11y-ci` against marketing pages (belt + suspenders to axe).

---

## 8. Data model additions (migration `0026_vcard_seo_ai.sql`)

```sql
alter table vcard_profile_ext
  add column if not exists is_indexable boolean not null default true,
  add column if not exists ai_indexing text not null default 'allow_search_only'
    check (ai_indexing in ('allow_search_only','allow_all','disallow_all')),
  add column if not exists canonical_host text;  -- nullable; pro-only

create table if not exists vcard_seo_redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique,
  to_path text not null,
  status int not null default 308 check (status in (301,302,307,308,410)),
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- crawl log (sampled)
create table if not exists vcard_crawl_log (
  ts timestamptz not null default now(),
  bot text not null,
  path text not null,
  status int not null,
  ms int not null
);
create index if not exists vcard_crawl_log_ts on vcard_crawl_log(ts desc);
```

`middleware.ts` reads UA, classifies bot, samples 1% to log; respects `vcard_seo_redirects` and `noai` headers.

---

## 9. Rollout (phased, each phase shippable)

### Phase 1 — Crawl + Index (week 1)
- Create `public/og-default.png`, `public/icons/*`, splash images.
- Implement `lib/seo.ts`, `lib/jsonld.ts`.
- Implement `app/robots.ts`, `app/sitemap.ts` + paginated children.
- Migrate every existing public route to `buildMetadata`.
- Add JSON-LD to `/`, `/pricing`, `/u/[username]`, `/shop`, `/shop/[slug]`.
- Static OG images for marketing routes.
- **Exit:** Lighthouse SEO 100 on `/`, `/pricing`, `/u/[seed]`. Search Console verified.

### Phase 2 — Dynamic OG + LLM (week 2)
- `opengraph-image.tsx` for `/u/[username]`, `/shop/[slug]`.
- `app/llms.txt`, `app/llms-full.txt`, `/ai-policy` page.
- `.well-known/ai-plugin.json`, `/openapi.json`.
- `app/u/[username]/data.json/route.ts` + `Link: rel=alternate`.
- Migration 0026 + `ai_indexing` user setting in account UI.
- **Exit:** OG renders pass `og.spec.ts`. `llms.txt` validator passes. Per-user AI toggle works.

### Phase 3 — PWA (week 3)
- `app/manifest.ts`, `app/sw.ts`, `app/offline/page.tsx`.
- Install + update components.
- iOS splash + apple-icon.
- Share target + protocol handler.
- **Exit:** Lighthouse PWA ≥ 90. Manual install on Android Chrome + iOS Safari. Offline navigation works.

### Phase 4 — Performance + observability (week 4)
- Edge cache for profiles/shortlinks/products.
- Blurhash placeholders.
- Bundle budget enforcement in CI.
- Vercel Speed Insights + Sentry web vitals + PostHog SEO/AI referral funnels.
- **Exit:** All KPI gates in §0 met on staging. Lighthouse CI green on PRs.

### Phase 5 — Hardening + post-launch (week 5+)
- Submit sitemap to Google + Bing.
- Submit `llms.txt` to llmstxt.org directory + Perplexity Sources.
- IndexNow integration (`/api/indexnow` ping on profile publish).
- Weekly RUM/SEO digest.

---

## 10. Definition of Done (this initiative)

- [ ] `/robots.txt`, `/sitemap.xml`, `/llms.txt`, `/manifest.webmanifest`, `/sw.js` all return 200 with correct content-type and headers.
- [ ] Every public route has unique title, description, canonical, OG, JSON-LD; every authed route has `noindex`.
- [ ] Lighthouse mobile thresholds in §0 met for the four surface tiers.
- [ ] `pwa-offline.spec.ts` + `pwa-update.spec.ts` green.
- [ ] Sitemap submitted to Search Console + Bing; both report < 1% errors.
- [ ] `vcard_profile_ext.ai_indexing` setting visible + functional in account → privacy.
- [ ] `BUILD_PLAN.md` §5/§6/§37 cross-references this doc; `docs/PWA_SEO_UPGRADE_PLAN.md` marked legacy.

---

## 11. Risks & mitigations

| Risk                                              | Mitigation                                                                         |
| ------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Stale SW serves old profile after publish         | `revalidateTag` on publish + `NetworkFirst` for `/u/*` data.json + auto-update toast |
| Dynamic OG ImageResponse cold-start on Edge       | Cache 24h + warm via cron on top-100 profiles                                      |
| LLM scrapers ignore robots                        | Cloudflare bot fight rules + middleware UA gate + per-user `noai` HTTP header      |
| Sitemap > 50k URLs                                | Already paginated at 5k                                                            |
| Custom-domain canonical loop                       | Rel=canonical strictly to apex unless explicit Pro override                        |
| Lighthouse flake in CI                            | 3-run median, single-route runs, dedicated CI machine                              |
| PWA install offered too aggressively              | Gate: 30s on landing, 2nd visit on dashboard, dismissed → 30-day cooldown          |

---

## 12. Open questions

1. **Custom-domain canonicalization**: do we treat the apex profile URL as the canonical SEO surface, or let Pro users self-canonicalize? Default proposal: apex; Pro toggle to flip.
2. **Public directory** (`/directory`): launch with auto-inclusion or opt-in only? Privacy lean: opt-in (default off).
3. **AI training opt-in by default?** Default proposal: `allow_search_only` (search index yes, training no).
4. **`web+voidcard://` protocol handler**: ship at launch or v1.1?
5. **Push notifications**: confirm v1.1 punt; reserve schema only for now.
