# VoidCard — Master Build Plan (v1.2)

> **Goal:** A million-dollar SaaS competing head-on with [dotcards.net](https://dotcards.net). NFC-powered digital business cards, sleeker customization, integrated shop, link shortener, admin console.
>
> **Domain:** `vcard.ed5enterprise.com`
> **Short domain:** `vc.ed5e.co` (link-shortener / NFC redirect target)
> **Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind 3.4 · Supabase (shared w/ ED5 ecosystem) · Stripe · Resend · Vercel
>
> **Reference UI:** Drop the 6 mockup PNGs into `docs/mockups/` as `01-home.png`, `02-gallery.png`, `03-post-detail.png`, `04-edit-profile.png`, `05-insights.png`, `06-links.png`. The implementation MUST match these mockups pixel-faithfully on a 390×844 viewport.
>
> **One-shot build directive:** This document is the single source of truth. An agent should be able to execute it linearly without further design decisions.

---

## A. Design System (locked from `docs/mockups/`)

The mockups define the **flagship "Onyx Gold"** preset — pure black with gold accents, serif display, soft hairline borders, 5-tab bottom nav. **Every value below is overridable per-user** (see §11 Customization). This is the *default*, not a constraint.

### A.1 Color tokens (Onyx Gold preset)
```ts
// lib/themes/presets/onyx-gold.ts
export const onyxGold = {
  bg:        "#000000",       // page
  surface:   "#0B0B0D",       // cards
  surface2:  "#141417",       // nested cards (bottom nav, chips)
  border:    "rgba(212,168,83,0.18)", // gold hairline
  text:      "#F5F1E8",       // headings (warm off-white)
  textMuted: "#9A958A",
  primary:   "#D4A853",       // gold (buttons, icons)
  primaryHi: "#F2D27A",       // gradient stop
  primaryLo: "#A47A2C",
  success:   "#7FB069",
  danger:    "#E26D5A",
} as const;
```
Gold gradient for primary CTAs: `linear-gradient(135deg,#F2D27A 0%,#D4A853 50%,#A47A2C 100%)` with subtle inner-shadow `inset 0 1px 0 rgba(255,255,255,0.25)`.

### A.2 Typography
- **Display / serif:** `Fraunces` (Google Fonts, opsz 9–144) — used for H1/H2 ("Void Luxury Detailing", "Highlights", "Gallery", "Insights", "Services & Links"). `next/font/google`, `display: 'swap'`, axes `opsz, SOFT, WONK`.
- **Body / sans:** `Inter` variable.
- Numeric tabular for KPIs.
- Section title pattern (matches mockups): serif H2 + small gold horizontal line accent (`<span className="ml-3 inline-block h-px w-10 bg-primary/70" />`).

### A.3 Spacing & radius
- Card radius `rounded-[20px]` (xl in mockup), inner chips `rounded-[14px]`, bottom-nav pill `rounded-full`.
- Card padding `p-4` mobile, `p-5` >sm.
- Gap between cards `gap-3`.
- Hairline border `border border-white/[0.06]` + subtle gold tint `ring-1 ring-primary/10`.

### A.4 Elevation & glow
- Cards: `bg-surface` + `shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_24px_-12px_rgba(0,0,0,0.6)]`.
- Active items get a gold glow: `shadow-[0_0_0_1px_rgba(212,168,83,0.35),0_8px_24px_-8px_rgba(212,168,83,0.25)]`.
- Subtle "lens flare" on bottom-right of hero CTAs (decorative SVG, ~6% opacity).

### A.5 Iconography
- `lucide-react`, stroke 1.5, color = `currentColor`, primary tint by default on profile cards.
- Round icon chip (`size-10 rounded-full bg-surface2 ring-1 ring-primary/30 flex items-center justify-center`) used in Highlights, Links, Insights tabs.

### A.6 Components confirmed by mockups
| Mockup | Component |
|---|---|
| 01 Home | `<ProfileHeader>` (avatar orb + name + verified badge + handle + bio), `<PrimaryActions>` (Save Contact + Share), `<QuickActions>` (Call/Text/Email/Map), `<HeroMedia>` (Before/After slider + thumb strip + page-dots), `<HighlightsGrid>` (2-col cards), `<BottomNav>` (5 tabs) |
| 02 Gallery | `<PageHeader>` (serif title + subtitle + line accent), `<FilterChips>` (pill segmented), `<CategoryStories>` (round + Upload first), `<MediaGrid>` (2-col, like-count, timestamp), `<UploadFAB>` |
| 03 Post detail | `<MediaCarousel>` (1/8 counter), `<PostMeta>`, `<TagPills>`, `<EngageBar>` (Like/Save/Share/Inquiry), `<RelatedStrip>`, `<BookCTA>` |
| 04 Edit profile | `<EditPreviewCard>`, `<SectionBuilder>` (drag handle + icon + title + meta + per-section toggle + chevron), `<ThemeQuickSwitcher>` (3 chips inline), `<PublishBar>` |
| 05 Insights | Date range pill (7D/30D/90D), `<KpiCard>` w/ delta (3-up then 2-up), `<LineChart>` `<BarChart>` `<DonutChart>` (recharts, gold palette), `<TopContent>`, `<TopLinks>` rows w/ delta |
| 06 Links | Search + filter, 2-col `<LinkTile>` icon-chip cards, `<PremiumPackagesStrip>` (3-up product cards w/ "MOST POPULAR" ribbon), trust banner |

### A.7 Bottom nav (universal — both public profile *preview app shell* AND user dashboard)
5 tabs: **Home · Gallery · Links · Share · Profile**. Active tab: gold icon + label, inactive: muted. The Share tab opens a sheet (Web Share API + QR + copy).

### A.8 Motion
- Tap scale 0.97 spring on every card.
- Section reorder: framer-motion layout animation.
- Theme switch: cross-fade 250ms + CSS-vars transition.
- Gallery image: shared-layout transition into post-detail (`layoutId={"post-"+id}`).
- Before/After slider: drag handle, 60fps.



---

## 0. Ecosystem Integration Contract

VoidCard is **app #N in the ED5 Enterprise ecosystem**. It MUST conform to the contracts below.

### 0.1 Shared Supabase project
- Single Supabase project shared with `ed5-enterp`, `worldafter/website`, `IconMaker-Agent`, etc.
- **Reuse `.env.local` values** from sibling repos (copy `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` verbatim).
- **`profiles` table is shared and untouchable** — VoidCard reads `id`, `role` only. We extend by writing to a side-table `vcard_profile_ext` keyed by `profiles.id`.

### 0.2 Table-naming rule
| Concern | Allowed |
|---|---|
| Shared (auth, role, billing) | `profiles` (existing), `auth.*` |
| VoidCard-only | **MUST** be prefixed `vcard_…` |

Any new column requested on `profiles` is **rejected** — put it in `vcard_profile_ext`.

### 0.3 SSO (cookie sharing)
Cookie domain = `.ed5enterprise.com` (matches `ed5-enterp/middleware.ts` & `lib/supabase/server.ts`). A user logged in on `ed5enterprise.com` is automatically logged in on `vcard.ed5enterprise.com`. Sign-out clears across all sub-apps.

```ts
// lib/supabase/server.ts (must match ed5-enterp exactly)
const cookieDomain = process.env.AUTH_COOKIE_DOMAIN || ".ed5enterprise.com";
```

### 0.4 Admin gate
Admin = `profiles.role === 'admin'` (single source of truth). Use the `requireAdmin()` helper pattern from `ed5-enterp/lib/auth.ts`.

---

## 1. Product Scope (vs. dotcards.net)

**Positioning:** *Free forever, fully-featured. Cards are the product.* Pro tier unlocks business/team power features but is **not** required for a beautiful, fully customized profile.

| Feature | dotcards | VoidCard Free | VoidCard Pro |
|---|---|---|---|
| Digital profile page | ✅ basic | ✅ + 12 themes, custom CSS, every section type | ✅ |
| Custom theme builder | partial | ✅ full | ✅ full |
| NFC pairing | via app | ✅ web | ✅ web |
| Apple / Google Wallet pass | ❌ | ✅ | ✅ |
| Full analytics | basic | ✅ | ✅ + CSV export, weekly digest |
| Embed widget | ❌ | ✅ | ✅ |
| 1-way contact capture | ✅ | ✅ | ✅ |
| 2-way contact exchange | ❌ | ❌ | ✅ |
| Lead-capture forms | ❌ | ❌ | ✅ |
| Custom domain | paid | ❌ | ✅ |
| Remove VoidCard footer | paid | ❌ | ✅ |
| Multiple profiles per account | paid | 1 | up to 10 |
| Paired cards per account | paid | 1 | unlimited |
| Custom font upload | ❌ | ❌ | ✅ |
| Password-protected profile | ❌ | ❌ | ✅ |
| Scheduled publish + A/B variants | ❌ | ❌ | ✅ |
| Public REST API + webhooks | ❌ | ❌ | ✅ |
| Media storage | — | 5 GB | 50 GB |
| Verified badge | manual | separate (§24b) | separate (§24b) |

### 1.1 Pricing
- **Free** — forever. No card required.
- **Pro** — **$4.99 / month** or **$39 / year** (~35% off). 14-day free trial, no card required to start.
- **Team** — **$14.99 / month** or **$119 / year**. 10 seats, shared brand kit, role permissions, 250 GB pooled storage, team analytics rollup.
- **Verified badge** — **$5 one-time** OR **free with any card purchase** (manual review). Separate from tiers — see §24b.

### 1.2 Revenue mix
1. **Cards & merch** (primary funnel, one-time):
   - NFC Card — **$19**
   - Premium Metal NFC Card — **$29**
   - Custom-Art NFC Card (upload logo, requires Verified) — **$49**
   - Keychain — **$15**
   - Sticker pack (5) — **$9**
   - Bundle (card + keychain + 5 stickers) — **$35**
   - Team 5-pack — **$79**
   - Replacement card (existing pairing transferred) — **$9**
2. **Pro / Team subscriptions** (recurring).
3. **Verified badge** ($5 one-time, optional).
4. **Optional seller revenue share** — platform fees are 0%; sellers can share 0-100% of Store/tip revenue, defaulting to 10%.

### 1.3 Free-tier "fair use" guards
Free profiles get the small footer link `Powered by VoidCard`. No tap caps, no view caps, no link caps. Storage cap (5 GB) is the only hard limit. This makes Free genuinely shareable so it serves as the viral acquisition channel for cards.

---

## 2. Repository Layout (final)

```
VoidCard/
├─ app/                              # App Router root
│  ├─ (marketing)/                   # public landing routes
│  │  ├─ page.tsx                    # hero, features, pricing, FAQ
│  │  ├─ pricing/page.tsx
│  │  ├─ shop/
│  │  │  ├─ page.tsx                 # product grid
│  │  │  ├─ [slug]/page.tsx          # PDP w/ variants
│  │  │  └─ cart/page.tsx
│  │  ├─ blog/[slug]/page.tsx
│  │  └─ legal/{privacy,terms,cookies}/page.tsx
│  ├─ (auth)/
│  │  ├─ login/page.tsx              # magic-link + OAuth (Google, Apple)
│  │  ├─ signup/page.tsx
│  │  └─ callback/route.ts
│  ├─ (app)/                         # authenticated dashboard
│  │  ├─ layout.tsx                  # sidebar + topbar
│  │  ├─ dashboard/page.tsx          # KPI overview
│  │  ├─ profile/
│  │  │  ├─ page.tsx                 # list profiles
│  │  │  ├─ [id]/edit/page.tsx       # WYSIWYG editor (drag/drop links, theme)
│  │  │  └─ [id]/preview/page.tsx
│  │  ├─ cards/
│  │  │  ├─ page.tsx                 # NFC card list + pair flow
│  │  │  └─ pair/page.tsx            # uses Web NFC API where avail, fallback QR/manual
│  │  ├─ shortlinks/page.tsx
│  │  ├─ analytics/page.tsx
│  │  ├─ contacts/page.tsx           # leads captured
│  │  ├─ orders/page.tsx
│  │  ├─ team/page.tsx
│  │  └─ settings/{account,billing,domain,danger}/page.tsx
│  ├─ admin/                         # /admin/*  (role===admin)
│  │  ├─ layout.tsx                  # requireAdmin()
│  │  ├─ page.tsx                    # platform KPIs
│  │  ├─ users/page.tsx
│  │  ├─ profiles/page.tsx
│  │  ├─ orders/page.tsx
│  │  ├─ products/page.tsx           # CRUD shop SKUs
│  │  ├─ shortlinks/page.tsx
│  │  ├─ flags/page.tsx              # feature flags / kill switches
│  │  └─ login/page.tsx
│  ├─ u/[username]/                  # PUBLIC profile (SEO sitemap'd)
│  │  ├─ page.tsx
│  │  ├─ opengraph-image.tsx         # dynamic OG
│  │  └─ vcard.vcf/route.ts          # downloadable vCard
│  ├─ c/[cardId]/route.ts            # NFC tap → 302 to /u/{username} + log tap
│  ├─ s/[slug]/route.ts              # short-link redirect (also served on vc.ed5e.co)
│  ├─ exchange/[token]/page.tsx      # 2-way contact exchange
│  ├─ api/
│  │  ├─ analytics/track/route.ts    # POST tap/view events
│  │  ├─ stripe/
│  │  │  ├─ checkout/route.ts
│  │  │  └─ webhook/route.ts
│  │  ├─ shop/orders/route.ts
│  │  ├─ profile/route.ts
│  │  ├─ shortlinks/route.ts
│  │  ├─ nfc/pair/route.ts
│  │  ├─ vcard/[username]/route.ts
│  │  └─ admin/* (role-gated)
│  ├─ manifest.ts                    # PWA manifest
│  ├─ sitemap.ts
│  ├─ robots.ts
│  ├─ opengraph-image.tsx            # site default
│  ├─ globals.css
│  └─ layout.tsx                     # root + analytics + theme provider
├─ components/
│  ├─ ui/                            # shadcn-style primitives (button, dialog, dropdown, sheet, …)
│  ├─ marketing/                     # hero, feature-grid, pricing, faq, footer
│  ├─ profile/                       # ProfileRenderer, BottomNav, ProfileHeader, BeforeAfterSlider, HighlightsGrid
│  ├─ sections/                      # ONE FILE PER section type from §11.1 (server-rendered)
│  │  ├─ HeaderSection.tsx
│  │  ├─ PrimaryActionsSection.tsx
│  │  ├─ QuickActionsSection.tsx
│  │  ├─ HeroMediaSection.tsx        # client (slider)
│  │  ├─ HighlightsSection.tsx
│  │  ├─ GallerySection.tsx          # client (filters)
│  │  ├─ LinksSection.tsx
│  │  ├─ ServicesSection.tsx
│  │  ├─ TextSection.tsx
│  │  ├─ CtaSection.tsx
│  │  ├─ EmbedSection.tsx
│  │  ├─ FormSection.tsx             # client
│  │  ├─ ReviewsSection.tsx
│  │  ├─ MapSection.tsx
│  │  ├─ DividerSection.tsx
│  │  ├─ SpacerSection.tsx
│  │  └─ CustomHtmlSection.tsx       # sanitized
│  ├─ editor/                        # SectionBuilder, SectionPicker, SectionEditorSheet, ThemeQuickSwitch, LivePreviewFrame, PublishBar
│  ├─ shop/                          # ProductCard, VariantPicker, MiniCart, PremiumPackagesStrip
│  ├─ nfc/                           # WebNFCReader, QRPair, BatchPairTable
│  ├─ analytics/                     # KpiCard, RangePill, LineChart, BarChart, DonutChart, TopContent, TopLinks
│  ├─ admin/                         # tables, mod tools
│  └─ effects/                       # GradientMesh, ParallaxHero, GoldGlow, Confetti
├─ lib/
│  ├─ supabase/{client,server,service}.ts
│  ├─ auth.ts                        # requireUser, requireAdmin
│  ├─ stripe.ts
│  ├─ resend.ts
│  ├─ analytics.ts                   # server + client (Vercel + PostHog)
│  ├─ seo.ts                         # generateMetadata helpers
│  ├─ vcard.ts                       # generates .vcf strings
│  ├─ shortlinks.ts                  # base62 slug gen + collision retry
│  ├─ rate-limit.ts                  # upstash redis
│  ├─ feature-flags.ts
│  ├─ themes.ts                      # 12 built-in theme tokens
│  └─ utils.ts                       # cn(), formatters
├─ hooks/                            # useUser, useProfile, useDebounced…
├─ types/database.ts                 # `supabase gen types typescript`
├─ supabase/
│  ├─ config.toml
│  └─ migrations/
│     ├─ 0001_vcard_init.sql
│     ├─ 0002_vcard_shop.sql
│     ├─ 0003_vcard_analytics.sql
│     ├─ 0004_vcard_shortlinks.sql
│     ├─ 0005_vcard_team.sql
│     └─ 0006_vcard_rls.sql
├─ public/
│  ├─ icons/                         # PWA icons 192/512/maskable
│  ├─ og-default.png
│  └─ apple-touch-icon.png
├─ scripts/
│  ├─ migrate.mjs
│  ├─ seed-shop.mjs
│  └─ validate-env.mjs               # carry over from current
├─ middleware.ts
├─ next.config.ts
├─ tailwind.config.ts
├─ postcss.config.mjs
├─ tsconfig.json
├─ .env.example
└─ package.json
```

**Migration:** keep `docs/`, `scripts/validate-env.mjs`, `BUILD_PLAN.md`. Delete `src/`, `index.html`, Vite/Firebase configs. Move `tests/` → root after rewriting in Vitest.

---

## 3. Database Schema

All migrations in `supabase/migrations/000X_vcard_*.sql`. Apply via `pnpm supabase db push` against the **shared** project.

### 3.1 `vcard_profile_ext` (per-user vCard data)
```sql
create table public.vcard_profile_ext (
  user_id      uuid primary key references auth.users(id) on delete cascade,
  username     citext unique not null,             -- /u/{username}
  display_name text,
  title        text,
  company      text,
  bio          text,
  avatar_url   text,
  cover_url    text,
  phone        text,
  email_public text,
  location     text,
  verified     boolean not null default false,     -- gold checkmark badge
  links        jsonb not null default '[]'::jsonb, -- legacy quick-links
  socials      jsonb not null default '{}'::jsonb,
  sections     jsonb not null default '[]'::jsonb, -- §11 page builder sections (live)
  sections_draft jsonb,                            -- editor draft (null when in sync)
  theme        jsonb not null default '{"preset":"onyx-gold","overrides":{}}'::jsonb,
  custom_domain text unique,
  is_public    boolean not null default true,
  password_hash text,                              -- optional gated page (Pro)
  plan         text not null default 'free',
  created_at   timestamptz default now(),
  updated_at   timestamptz default now()
);
create index on public.vcard_profile_ext (lower(username));
```

### 3.1b `vcard_media` (gallery + hero media library)
```sql
create table public.vcard_media (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  profile_id   uuid references public.vcard_profile_ext(user_id) on delete cascade,
  kind         text not null,            -- image|video|before_after
  url          text not null,            -- supabase storage public url
  url_after    text,                     -- for before/after pair
  thumb_url    text,
  width        int, height int, duration int,
  category     text,                     -- exterior|interior|wheels|coating|... (free-form per profile)
  caption      text,
  alt          text,
  likes        int not null default 0,
  order_index  int not null default 0,
  created_at   timestamptz default now()
);
create index on public.vcard_media (profile_id, order_index);
```

### 3.2 `vcard_cards` (NFC chips)
```sql
create table public.vcard_cards (
  id          text primary key,                    -- printed on chip, base32 12-char
  owner_id    uuid references auth.users(id) on delete set null,
  profile_id  uuid references public.vcard_profile_ext(user_id) on delete set null,
  sku         text,                                -- which physical product
  status      text not null default 'unpaired',    -- unpaired|paired|disabled
  paired_at   timestamptz,
  batch_id    uuid,
  created_at  timestamptz default now()
);
```

### 3.3 `vcard_shortlinks`
```sql
create table public.vcard_shortlinks (
  slug        text primary key,                    -- base62, 5–8 chars
  owner_id    uuid references auth.users(id) on delete cascade,
  target_url  text not null,                       -- usually /u/{username} but free-form
  clicks      bigint not null default 0,
  enabled     boolean not null default true,
  expires_at  timestamptz,
  created_at  timestamptz default now()
);
```

### 3.4 `vcard_taps` (events)
```sql
create table public.vcard_taps (
  id          bigserial primary key,
  card_id     text references public.vcard_cards(id) on delete set null,
  profile_id  uuid references public.vcard_profile_ext(user_id) on delete set null,
  shortlink   text,
  source      text,                                -- nfc|qr|short|direct
  ip_hash     text,                                -- sha256(ip+salt) — never store raw
  ua          text,
  country     text,
  region      text,
  city        text,
  referrer    text,
  device      text,
  tapped_at   timestamptz default now()
);
create index on public.vcard_taps (profile_id, tapped_at desc);
```

### 3.5 Shop
```sql
create table public.vcard_products (
  id           uuid primary key default gen_random_uuid(),
  slug         text unique not null,
  name         text not null,
  description  text,
  images       jsonb default '[]'::jsonb,
  price_cents  int not null,
  stripe_price_id text,
  active       boolean not null default true,
  category     text,                               -- card|keychain|sticker|bundle
  variants     jsonb default '[]'::jsonb,          -- [{id,name,priceDelta,sku,stock}]
  created_at   timestamptz default now()
);
create table public.vcard_orders (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id),
  email           text not null,
  stripe_session_id text unique,
  stripe_payment_intent text,
  status          text not null default 'pending', -- pending|paid|fulfilled|refunded|cancelled
  amount_cents    int not null,
  currency        text not null default 'usd',
  shipping        jsonb,
  items           jsonb not null,                  -- snapshot
  tracking_number text,
  carrier         text,
  notes           text,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
```

### 3.6 Contacts captured (lead-gen via vCard download)
```sql
create table public.vcard_contacts (
  id           uuid primary key default gen_random_uuid(),
  profile_id   uuid references public.vcard_profile_ext(user_id) on delete cascade,
  name         text,
  email        text,
  phone        text,
  company      text,
  message      text,
  source       text,                               -- exchange|form|download
  created_at   timestamptz default now()
);
```

### 3.7 Teams (multi-seat)
```sql
create table public.vcard_teams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  owner_id    uuid not null references auth.users(id) on delete cascade,
  plan        text not null default 'team',
  created_at  timestamptz default now()
);
create table public.vcard_team_members (
  team_id  uuid references public.vcard_teams(id) on delete cascade,
  user_id  uuid references auth.users(id) on delete cascade,
  role     text not null default 'member',         -- owner|admin|member
  primary key (team_id, user_id)
);
```

### 3.8 RLS (in `0006_vcard_rls.sql`)
- `vcard_profile_ext`: SELECT public when `is_public=true`; UPDATE/INSERT only `auth.uid() = user_id`; admin bypass.
- `vcard_cards`: owner read/write; admin all; **public can SELECT `id,profile_id,status` only** (used by `/c/[id]` route via service role server-side).
- `vcard_shortlinks`: owner read/write; lookup happens server-side w/ service role.
- `vcard_taps`: INSERT public (rate-limited at edge); SELECT owner+admin.
- `vcard_products`: SELECT public when `active=true`; INSERT/UPDATE/DELETE admin.
- `vcard_orders`: SELECT owner+admin; INSERT via service role only (Stripe webhook).
- `vcard_contacts`: INSERT public (captcha-gated); SELECT owner+admin.
- `vcard_teams` / `_members`: members read; owner/admin write.

---

## 4. Auth & SSO

- Use `@supabase/ssr` exactly like `ed5-enterp/lib/supabase/{client,server}.ts` (already cookie-domain `.ed5enterprise.com`).
- `middleware.ts` mirrors ed5-enterp: refresh session on every non-static request.
- `lib/auth.ts`:
  ```ts
  export async function requireUser() { … redirect('/login') }
  export async function requireAdmin() { …role==='admin' or redirect('/admin/login') }
  export async function requirePro() { …plan in ['pro','team','enterprise'] or redirect('/pricing') }
  ```
- Login page: magic-link + Google OAuth + Apple OAuth (Supabase providers).
- Signup auto-creates `vcard_profile_ext` row with username = `slugify(email-localpart)+random4`.

---

## 5. PWA (must-have)

- `app/manifest.ts` exports a `MetadataRoute.Manifest` with `display:'standalone'`, theme `#0a0a0f`, 8 icons (192/512/maskable, monochrome SVG, apple-touch-180).
- Service worker: use **`@serwist/next`** (modern, App-Router-friendly) — precaches static, runtime caches `/u/*` HTML w/ stale-while-revalidate, offline fallback page `/offline`.
- Install prompt component on landing + dashboard.
- iOS splash screens (12 sizes) generated via `pwa-asset-generator`.

---

## 6. SEO

- Static metadata in `app/layout.tsx` + `lib/seo.ts` `buildMetadata({title, description, image, path})`.
- Dynamic OG images: `app/u/[username]/opengraph-image.tsx` (Edge runtime, ImageResponse) renders avatar + name + brand color.
- `app/sitemap.ts` queries `vcard_profile_ext` where `is_public=true`, returns canonical URLs.
- `app/robots.ts` allows all except `/admin`, `/api`, `/(app)/*`.
- JSON-LD `Person` schema on every public profile.
- `next-seo`-style breadcrumbs on shop.
- Image optimization via `next/image`. All `<img>` lint-banned.
- Per-route `generateMetadata` for shop products, blog, profiles.
- Lighthouse target: **100 / 100 / 100 / 100** desktop, **≥95** mobile.

---

## 7. Analytics

Three layers, additive:
1. **Vercel Analytics + Speed Insights** (zero-config) — site-wide traffic + Core Web Vitals.
2. **PostHog (self-hosted EU)** for product analytics (funnels: signup → first profile → first tap → first sale). `lib/analytics.ts` wraps `posthog-js` + server `posthog-node`.
3. **First-party tap analytics** — `/api/analytics/track` POST → `vcard_taps`. Edge runtime, MaxMind geo-IP free tier (or Vercel `request.geo`). IP is **hashed with daily rotating salt**, never stored raw (GDPR).

Dashboard widgets: total taps (7/30/90d), unique visitors, top profiles, top cards, geo heatmap (react-simple-maps), device breakdown, conversion funnel.

The user-facing **Insights** page (mockup 05) renders:
- Range pill `7D / 30D / 90D` + custom date-range pop.
- 3-up KPIs: Profile Views · Contact Saves · Link Clicks (each w/ delta vs previous period).
- 2-up KPIs: Gallery Views · Shares.
- Two charts side-by-side: Profile Views (line) + Link Clicks (bar) — gold palette `["#F2D27A","#D4A853","#A47A2C"]`.
- Top Performing Content: 4-up image strip w/ view count + delta.
- Top Links: list w/ icon-chip + clicks + delta.
- Traffic Sources donut + Devices split.
All charts use **recharts** with custom dark theme; numbers tabular-nums; deltas color-coded (success/danger).

---

## 8. NFC Pairing Flow

### User flow
1. User receives card with id printed (`vcd_8x4tk7m2`) and short URL `vc.ed5e.co/p/<id>`.
2. **First tap on unpaired card** → redirects to `/cards/pair?cardId=…&token=<jwt>` (token signed server-side at fulfillment time, single-use, 30-day TTL).
3. User logs in → picks profile → server verifies token, sets `vcard_cards.owner_id` & `profile_id`, status=`paired`.
4. Subsequent taps → `/c/[cardId]` route reads `profile_id` → 302 to `/u/{username}` + async `INSERT INTO vcard_taps`.

### Tech
- `/c/[cardId]/route.ts` — Edge runtime, ~10ms p95.
- Web NFC API in `components/nfc/WebNFCReader.tsx` for **writing** new chips (admin batch-pair UI). Falls back to manual entry on iOS.
- Batch-pair admin tool: paste CSV of `cardId,sku` → bulk insert.

---

## 9. Link Shortener (`vc.ed5e.co`)

- Buy domain `ed5e.co`. Add Vercel project alias `vc.ed5e.co` to same deployment.
- `middleware.ts` detects host:
  - `vc.ed5e.co` + path `/<slug>` → rewrite to `/s/<slug>`.
  - `vc.ed5e.co` + path `/p/<cardId>` → rewrite to `/c/<cardId>`.
  - `vc.ed5e.co` + path `/u/<username>` → rewrite to `/u/<username>` (works the same).
- `/s/[slug]/route.ts` — Edge, looks up `vcard_shortlinks` (Redis-cached 60s), 308 redirect, async increment + tap log.
- Slug generator: nanoid base62 length 6 (≈56B combos), retry on collision.
- User can claim **personal short** like `vc.ed5e.co/john` (reserved usernames map 1:1 from `vcard_profile_ext.username`).

---

## 10. Shop

- Products managed in `/admin/products` (CRUD).
- Public `/shop` uses ISR (`revalidate: 300`).
- Cart = client state (Zustand) persisted to `localStorage` + synced to `vcard_carts` (auth users) for cross-device.
- Checkout = Stripe Checkout Session (`mode: payment`, shipping_address_collection, automatic_tax). Webhook (`/api/stripe/webhook`) verifies signature → upserts `vcard_orders` → sends Resend confirmation email + admin notification.
- Inventory tracking via `variants[].stock` decremented in webhook (with `for update` lock).

### 10.1 SKU matrix (seeded by `scripts/seed-shop.mjs`)
| SKU | Name | Price | Variants | Notes |
|---|---|---|---|---|
| `card-pvc` | NFC Card | $19 | color: black/white/gold-foil | std PVC |
| `card-metal` | Premium Metal NFC Card | $29 | color: black/silver/gold | brushed metal |
| `card-custom` | Custom-Art NFC Card | $49 | upload artwork | **requires Verified badge** (§24b) |
| `custom-design-addon` | Custom design add-on | +$10 default | saved card-designer file | added to eligible card orders; price editable in `/admin/products` via `shop.custom_design_addon_cents` |
| `keychain` | NFC Keychain | $15 | leather: black/tan | |
| `stickers-5` | NFC Sticker pack (5) | $9 | — | |
| `bundle-starter` | Starter Bundle | $35 | — | card + keychain + stickers |
| `team-5pack` | Team 5-pack Cards | $79 | metal/PVC | bulk-pair flow auto-trigger |
| `card-replacement` | Replacement Card | $9 | — | gated: must own original card; transfers pairing |
| `verified-badge` | Verified Badge | $5 | — | digital, no shipping; opens review flow |

### 10.2 Card-purchase → bonuses (auto-applied by webhook)
- Any physical card purchase grants **+1 GB lifetime storage** on the buyer's account (capped at +25 GB cumulative).
- `bundle-starter`, `team-5pack`, `card-metal`, `card-custom` purchases also grant **free Verified review** (skip the $5).

### 10.3 Card fulfillment & bulk-pair
- Admin generates a batch of unpaired card IDs at print time (`/admin/cards/batch`). CSV exported, sent to print partner.
- After purchase, an **NFC pair-token URL** (§23) is the chip's payload — printed/written to chip by partner.
- For `team-5pack`: order webhook auto-issues 5 transferable invite codes the buyer can hand to teammates.

---

## 11. Profile Page = Section-based Page Builder

**Core idea:** every public profile is a **stack of typed Sections** rendered into a phone-shell layout (matches mockup 01). Users add/remove/reorder/style sections. Themes are merely *defaults* — every property is overridable per section, per profile. This makes pages feel **owned**, not templated.

### 11.1 Section types (v1)
| Type | Purpose | Settings |
|---|---|---|
| `header` | Avatar + name + verified + handle + bio | avatar shape (circle/squircle/orb-ring), verified on/off, layout (centered/left), badge color |
| `primary_actions` | Save Contact + Share Profile | label, icon, gradient on/off, order |
| `quick_actions` | Call/Text/Email/Map row | items[], icon set, columns (3–5) |
| `hero_media` | Before/After slider OR carousel OR video | media[], autoplay, page-dots |
| `highlights` | 2-col link cards w/ icon-chip + title + subtitle (mockup 01 bottom) | items[], columns (1/2/3), icon style |
| `gallery` | Tabbed grid w/ filters & categories (mockup 02) | columns, filters[], category stories on/off, allow upload |
| `links` | Stacked or 2-col link tiles (mockup 06) | layout, search on/off, items[] |
| `services` | Premium package cards w/ price + ribbon (mockup 06 bottom) | items[], "MOST POPULAR" tag, currency |
| `text` | Rich-text/about | markdown |
| `cta` | Pay deposit / Book / Inquiry banner | gradient, icon, target |
| `embed` | YouTube/Vimeo/Spotify/Calendly/Stripe Payment Link | url |
| `form` | Lead capture / contact form | fields[], destination email |
| `reviews` | Pulled from Google/Trustpilot or manual | source, items[] |
| `map` | Mapbox embed of business location | lat,lng,zoom |
| `divider` | Title + accent line | label |
| `spacer` | Pure spacing | height |
| `custom_html` | Pro-only sandboxed HTML | code (server-sanitized w/ DOMPurify) |

### 11.2 Per-section style overrides
Every section instance can override:
```ts
type SectionStyle = {
  bg?: string;            // hex / token / gradient / image url
  textColor?: string;
  accent?: string;        // overrides theme primary
  radius?: number;        // 0–32
  padding?: 'sm'|'md'|'lg'|'xl';
  border?: 'none'|'hairline'|'glow';
  hidden?: boolean;
  visibleOn?: ('mobile'|'desktop')[];
  customCss?: string;     // Pro
};
```

### 11.3 Editor UX (matches mockup 04)
- Top: live preview card. Tap → opens full preview (mockup 01).
- "Build Your Profile" list — drag handles (`⋮⋮`), icon chip, title, meta ("4 actions", "5 photos"), per-section **toggle**, chevron → drill-down editor.
- Inline **theme quick-switcher** chips (3 visible, "View All" opens sheet).
- Sticky bottom **Publish Changes** gold-gradient button. Subtitle: "Your changes will be live immediately."
- Drill-down editor uses a slide-up sheet (`@radix-ui/react-dialog`), forms via `react-hook-form` + `zod`, autosave to draft, Publish promotes draft → live.
- Drag/drop via `@dnd-kit/sortable`. Reorder also possible from a "Reorder" mode toggle for accessibility (keyboard arrows).
- Add Section → searchable picker w/ icons + previews.
- Live preview is an **iframe** to `/u/<username>?preview=<draft_id>` so styles never leak between editor and renderer; updates via `postMessage` debounce 300ms.

### 11.4 Theme system
- 12 named presets, each is a complete token set: `colors`, `font` (display + body pair), `radius`, `shadow`, `iconStyle`, `cardLayout`, `dividers`, `bgPattern` (none/grain/dots/aurora/grid), `motion` (`subtle`|`bold`).
- Presets shipped: **Onyx Gold** (default, mockups), Aurora, Glass, Mono, Brutalist, Neon, Sunset, Mint, Carbon, Paper, Holographic, Minimal Pro.
- "Custom Theme" tab exposes every token as a control (color picker w/ HSL+OKLCH, gradient builder, font pairs from a curated list of 20, background pattern picker, radius slider, motion toggle).
- Pro-only: upload custom font (woff2), custom CSS, custom favicon, custom OG image, password-protected page, remove VoidCard branding.

### 11.5 Storage shape
```ts
// vcard_profile_ext.theme (jsonb)
{ preset: 'onyx-gold', overrides: { primary: '#D4A853', font: 'fraunces+inter', ... } }

// vcard_profile_ext.sections (jsonb) — NEW column added in migration 0001
[
  { id: 'h1',  type: 'header',         enabled: true, order: 0, props: {...}, style: {} },
  { id: 'pa1', type: 'primary_actions',enabled: true, order: 1, props: {...}, style: {} },
  { id: 'qa1', type: 'quick_actions',  enabled: true, order: 2, props: {...}, style: {} },
  { id: 'hm1', type: 'hero_media',     enabled: true, order: 3, props: {...}, style: {} },
  { id: 'hl1', type: 'highlights',     enabled: true, order: 4, props: {...}, style: {} },
  { id: 'cta1',type: 'cta',            enabled: true, order: 5, props: { label:'Pay Deposit', target:'/pay' } },
]
```

### 11.6 Renderer
`<ProfileRenderer sections theme />` is a **server component** that maps section type → server-rendered component. Only interactive sections (`hero_media` slider, `gallery` filters, `form`) hydrate as client components. Result: `/u/[username]` ships <70 KB JS even with full customization.

---

## 12. Admin Console

`/admin/*` — gated by `requireAdmin()`. Pages:
- KPIs (MRR, ARR, signups today, active profiles, taps today)
- Users table (search by email/username, impersonate, set role, set plan)
- Profiles table
- Orders table (mark fulfilled, add tracking → triggers Resend email)
- Products CRUD + Stripe sync button
- Cards: batch-create, CSV export, batch-pair
- Shortlinks: search, disable, expire
- Feature flags (`vcard_flags` table — JSON, cached 60s in memory)
- Audit log (every admin action → `vcard_audit_log`)

---

## 13. Design System

See **§A** at top — locked from `docs/mockups/`. Onyx Gold is the default preset; 11 additional presets ship in `lib/themes/presets/`. Token contract in `lib/themes/types.ts`.

---

## 14. Performance Budget

| Metric | Budget |
|---|---|
| LCP `/u/[username]` | < 1.0s on Fast 3G simulated |
| TTFB (Edge route) | < 100ms |
| JS first-load `/u/[username]` | < 70 KB gz |
| JS first-load `/dashboard` | < 200 KB gz |
| CLS | 0 |

Strategies: RSC by default, client islands only for editor/cart/animations, image `priority` only on LCP, font `display: swap`, no third-party scripts on `/u/*` page, edge runtime for `/c`, `/s`, `/api/analytics/track`.

---

## 15. Security & Compliance

- All public POST endpoints rate-limited via Upstash Redis (`@upstash/ratelimit`): 30 req/min/IP for `/api/analytics/track`, 5 req/min for `/api/contacts`, 10 req/15min for auth.
- Captcha (Turnstile) on signup + contact form.
- CSP header in `next.config.ts` (`Content-Security-Policy`), HSTS, X-Frame-Options DENY (except editor preview iframe — same-origin allow), Referrer-Policy strict-origin.
- IP hashing with daily-rotating salt for tap logs.
- Cookie consent banner for non-essential analytics (PostHog).
- GDPR data-export + delete endpoints.
- Stripe webhook signature verification.
- All admin routes RSC-only (no client API exposure).
- `npm audit` + `osv-scanner` in CI.
- OWASP top-10 review checklist in `docs/SECURITY.md`.

---

## 16. Testing

- **Vitest** unit tests for `lib/*` (themes, shortlinks, vcard generator, analytics geo).
- **Playwright** E2E: signup → create profile → tap → see analytics; shop checkout (Stripe test); admin sets role.
- **Lighthouse CI** in GitHub Actions, fails on score regression.
- Visual regression with `@playwright/test` screenshots for marketing + 3 themes.

---

## 17. CI / CD

- GitHub Actions: lint → typecheck → unit → build → e2e (preview deploy) → lighthouse.
- Vercel project, environments: Preview (per PR) + Production (`main`).
- Supabase migrations applied via `supabase db push` step gated on tag `db/*`.
- Sentry source-map upload step.

---

## 18. Environment Variables (`.env.example`)

```bash
# === Shared with ed5-enterp / worldafter (do NOT diverge) ===
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
AUTH_COOKIE_DOMAIN=.ed5enterprise.com
NEXT_PUBLIC_AUTH_COOKIE_DOMAIN=.ed5enterprise.com

# === Site ===
NEXT_PUBLIC_SITE_URL=https://vcard.ed5enterprise.com
NEXT_PUBLIC_SHORT_URL=https://vc.ed5e.co
NEXT_PUBLIC_APP_NAME=VoidCard

# === Stripe ===
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=

# === Email (Resend, shared key from ecosystem) ===
RESEND_API_KEY=
EMAIL_FROM=VoidCard <noreply@ed5enterprise.com>

# === Analytics ===
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=https://eu.posthog.com
NEXT_PUBLIC_VERCEL_ANALYTICS=1

# === Rate limit / cache ===
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=

# === Captcha ===
NEXT_PUBLIC_TURNSTILE_SITE_KEY=
TURNSTILE_SECRET_KEY=

# === Sentry ===
NEXT_PUBLIC_SENTRY_DSN=
SENTRY_AUTH_TOKEN=

# === NFC pairing token signing ===
NFC_PAIR_HMAC_SECRET=         # 64-hex
TAP_IP_SALT=                  # rotated daily by cron
```

---

## 19. Execution Order (the literal "1-shot" sequence)

> Each step is a single agent action. Execute top-down. Do not skip.

**Phase A — Foundation (Day 1)**
1. Backup current `src/` to `legacy-vite/` branch, push.
2. On `main`: delete `src/`, `index.html`, `vite.config.js`, `firebase.json`, `firestore.*`, `storage.rules`, `tailwind.config.cjs`, `postcss.config.cjs`, `netlify.toml`, `public/_redirects`, `public/404.html`.
3. `npm init next-app@latest . -- --ts --tailwind --eslint --app --src-dir false --import-alias "@/*"` (when prompted overwrite, accept; restore `BUILD_PLAN.md`, `docs/`, `scripts/validate-env.mjs`).
4. Install deps:
   ```
   npm i @supabase/ssr @supabase/supabase-js @stripe/stripe-js stripe \
     framer-motion lucide-react sonner clsx tailwind-merge zustand \
     @dnd-kit/core @dnd-kit/sortable react-simple-maps recharts \
     posthog-js posthog-node @vercel/analytics @vercel/speed-insights \
     @upstash/redis @upstash/ratelimit nanoid resend \
     @serwist/next @serwist/sw zod @hookform/resolvers react-hook-form
   npm i -D @types/node vitest @playwright/test @lhci/cli supabase \
     @types/react-simple-maps eslint-config-next prettier prettier-plugin-tailwindcss
   ```
5. Copy `lib/supabase/{client,server}.ts` and `middleware.ts` from `ed5-enterp` verbatim → adjust imports.
6. Create `.env.example`, copy `.env.local` from `ed5-enterp` and add VoidCard-only keys.
7. Add `tailwind.config.ts` with design tokens + `tailwindcss-animate`.
8. Create `app/layout.tsx`, `app/page.tsx` minimal hello-world; verify SSO works against shared Supabase.

**Phase B — DB (Day 2)**
9. Write all 6 migrations under `supabase/migrations/`. Apply against staging shared project.
10. `supabase gen types typescript --project-id <ref> > types/database.ts`.

**Phase C — Public profile + NFC (Day 3-4)**
11. Build `app/u/[username]/page.tsx` (RSC) + `ThemeRenderer` + 3 themes (Aurora, Glass, Mono).
12. Build `app/c/[cardId]/route.ts` Edge.
13. Build `vcard.vcf/route.ts`.
14. Build `app/api/analytics/track/route.ts` Edge w/ rate limit + IP hash.
15. Add `opengraph-image.tsx`, `sitemap.ts`, `robots.ts`, `manifest.ts`, JSON-LD.

**Phase D — Auth + Dashboard (Day 5-6)**
16. `(auth)/login`, `(auth)/signup`, `(auth)/callback`.
17. `(app)/layout.tsx` shell + `dashboard/page.tsx`.
18. `profile/[id]/edit` editor with live preview, drag-drop, all 12 themes.
19. `cards/pair`, `shortlinks`, `analytics`, `contacts`, `settings/*`.

**Phase E — Shop (Day 7-8)**
20. `(marketing)/shop` + PDP + cart + checkout.
21. Stripe checkout + webhook.
22. Order email templates (Resend).
23. Seed 8 starter products.

**Phase F — Admin (Day 9)**
24. `/admin/*` all sub-pages.
25. Audit log + feature flags.

**Phase G — Polish (Day 10-11)**
26. Marketing landing (hero, features, comparison-vs-dotcards table, pricing, FAQ, footer).
27. PWA service worker + offline page + install prompt.
28. PostHog wiring + funnels.
29. Lighthouse CI tuning to hit budgets.
30. Playwright E2E suite.

**Phase H — Launch (Day 12)**
31. Buy/configure `ed5e.co`, alias to Vercel project.
32. Configure DNS for `vcard.ed5enterprise.com` + `vc.ed5e.co`.
33. Switch Stripe to live, register webhook.
34. Submit sitemap to Google Search Console + Bing.
35. Open Graph & Twitter card validators pass.
36. Smoke test SSO from `ed5enterprise.com` → `vcard.ed5enterprise.com`.

---

## 20. Definition of Done

- [ ] Lighthouse ≥95 mobile, 100 desktop on `/`, `/u/demo`, `/shop`.
- [ ] PWA installable on iOS+Android, offline page works.
- [ ] SSO verified across all 3 sibling apps (`ed5enterprise.com`, `mmo.ed5enterprise.com`, `vcard.ed5enterprise.com`).
- [ ] No table created without `vcard_` prefix (except shared `profiles`).
- [ ] All RLS policies tested (selects/inserts as anon, user, other-user, admin).
- [ ] Stripe live checkout + webhook fulfill an order end-to-end.
- [ ] `vc.ed5e.co/<slug>` resolves in <50ms p95 from us-east.
- [ ] Web NFC write tested on Pixel + Galaxy; iOS QR fallback verified.
- [ ] `/u/[username]` first-load JS < 70 KB gz.
- [ ] All E2E tests green in CI.
- [ ] Sentry catches synthetic error end-to-end.
- [ ] Privacy policy, ToS, cookie banner live.

---

## 21. Storage & Image Pipeline

**Buckets** (Supabase Storage, created in `0007_vcard_storage.sql`):
| Bucket | Public | Use |
|---|---|---|
| `vcard-public` | yes | avatars, covers, gallery, OG images |
| `vcard-private` | no | order receipts, exports, deleted-user grace data |
| `vcard-fonts` | yes | Pro custom fonts (woff2 only) |

**Path convention:** `{bucket}/u/{user_id}/{kind}/{nanoid}.{ext}` (never user-supplied filenames).

**Upload flow:**
1. Client requests signed upload URL → `POST /api/media/sign` returns `{path, token, maxBytes, contentTypeAllow}`.
2. Client compresses w/ `browser-image-compression` (max 2400px long edge, q=0.82, mozjpeg/avif).
3. Direct PUT to Supabase Storage.
4. Client → `POST /api/media/finalize` with `{path}`. Server: re-validates MIME via magic-byte sniff (`file-type`), strips EXIF (sharp `withMetadata({orientation: undefined})`), generates blurhash + thumb (480w), inserts into `vcard_media`.
5. NSFW check via `nsfwjs` server-side for `gallery` uploads on free tier (Pro skips).

**Per-plan limits** (enforced server-side):
| Plan | Avatar | Gallery items | Video | Storage cap |
|---|---|---|---|---|
| Free | 5 MB | 20 | ❌ | 200 MB |
| Pro | 10 MB | 500 | 100 MB / clip | 10 GB |
| Team | 10 MB | 5000/user | 100 MB | 50 GB |

**MIME allow-list:** `image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,application/pdf` (PDF only on order/contact attachments). Hard reject SVG, HEIC converted server-side.

**Delivery:** `next/image` with `loader: 'custom'` pointing to Supabase Storage transform endpoint (`?width=&quality=&format=webp`). `priority` only on the LCP image of `/u/[username]`. All `<img>` lint-banned via `eslint-plugin-jsx-a11y` + custom rule.

**CDN:** Supabase Storage already CDN-fronted. For shop product images (heavy traffic), front with **Bunny CDN** pull-zone (`cdn.vcard.ed5enterprise.com`) — set in `next.config.ts` `images.remotePatterns`.

---

## 22. Custom Domains (Pro)

**Flow:**
1. User adds `cards.acme.com` in `/dashboard/settings/domain`.
2. We insert into `vcard_custom_domains (host, user_id, status='pending', verify_token, created_at)`.
3. UI shows DNS instructions: `CNAME cards.acme.com → cname.vcard.ed5enterprise.com` + `TXT _vcard-verify.cards.acme.com → <token>`.
4. Background job (`/api/cron/domains/verify` every 5 min) resolves TXT, on success calls Vercel Domains API `POST /v10/projects/{id}/domains` to attach + provision SSL via LE.
5. Status transitions: `pending → verifying → ssl_pending → live | failed`. UI shows step-by-step.
6. `middleware.ts` host detection:
   ```ts
   const host = req.headers.get('host')!;
   if (host !== ROOT_HOST && host !== SHORT_HOST && !host.endsWith('.vercel.app')) {
     // lookup vcard_custom_domains by host (cached in Upstash 60s)
     const domain = await getCustomDomain(host);
     if (!domain) return NextResponse.rewrite(new URL('/domain-not-found', req.url));
     return NextResponse.rewrite(new URL(`/u/${domain.username}${pathname}`, req.url));
   }
   ```
7. Apex domains: instruct ALIAS/ANAME (`vercel-dns-017.com`) since CNAME on apex unreliable.
8. Schema:
   ```sql
   create table public.vcard_custom_domains (
     host         text primary key,
     user_id      uuid not null references auth.users(id) on delete cascade,
     username     citext not null,
     verify_token text not null,
     status       text not null default 'pending',
     last_check_at timestamptz,
     ssl_provider text,
     created_at   timestamptz default now()
   );
   ```

**Required env:** `VERCEL_API_TOKEN`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID?`.

---

## 23. NFC Pair-Token Spec

Each printed card has `id` (12-char base32). Card lifecycle:

| Status | Meaning |
|---|---|
| `manufactured` | Created in DB, not yet sold |
| `unpaired` | Sold, awaiting first scan |
| `paired` | Linked to `profile_id` |
| `locked` | User-locked (lost card); 410 Gone |
| `transferring` | New owner pair flow active |
| `disabled` | Admin-killed (fraud/refund) |

**First-tap pair token** (only when `status='unpaired'`):
- Server signs JWT (HS256, `NFC_PAIR_HMAC_SECRET`):
  ```json
  { "kind":"nfc_pair", "card":"<id>", "exp": now+30d, "jti":"<nonce>" }
  ```
- Token URL: `https://vcard.ed5enterprise.com/cards/pair?t=<jwt>`.
- This URL is the **NFC chip's payload** at fulfillment time. After successful pair we **rewrite the chip** to the permanent `vc.ed5e.co/p/<cardId>` (Web NFC API on the user's phone after auth).
- `jti` stored in `vcard_nfc_jti` (used-once table, TTL 60d) — replay rejected.

**Transfer / resale flow:**
1. Owner clicks "Transfer card" → confirms 6-digit code emailed to them.
2. Card status → `transferring`, new pair-token issued, old token invalidated (jti revoked), `owner_id`, `profile_id` cleared on success.

**Lock flow** (lost card):
1. Owner clicks "Lock card". Status → `locked`, `/c/[id]` returns 410 + page "This card has been deactivated".
2. Optional "Replace": admin queues a replacement card with same `profile_id`, ships, transitions to `paired` on first scan.

**Anti-fraud on `/c/[id]` route:**
- Dedupe taps by `sha256(ip + card_id)` within rolling 1h window via Upstash Redis `INCR` w/ TTL.
- Counted tap only if first occurrence; otherwise pure redirect, no row in `vcard_taps`.

---

## 24. Subscriptions & Billing

> **Free is the default.** Pro/Team only gate the §1 feature table additions. Custom CSS, themes, sections, wallet passes, embed widget, and analytics are all **free**.

### 24.1 Plans → Stripe Products
| Plan | Price ID env | Price | Trial |
|---|---|---|---|
| Free | n/a | $0 | — |
| Pro Monthly | `STRIPE_PRICE_PRO_M` | $4.99 | 14d |
| Pro Yearly | `STRIPE_PRICE_PRO_Y` | $39 | 14d |
| Team Monthly | `STRIPE_PRICE_TEAM_M` | $14.99 | 14d |
| Team Yearly | `STRIPE_PRICE_TEAM_Y` | $119 | 14d |
| Enterprise | manual invoicing | custom | — |

### 24.2 Schema
```sql
create table public.vcard_subscriptions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  team_id         uuid references public.vcard_teams(id) on delete cascade,
  stripe_customer_id   text not null,
  stripe_subscription_id text unique,
  plan            text not null,        -- pro|team|enterprise
  interval        text not null,        -- month|year
  status          text not null,        -- trialing|active|past_due|canceled|incomplete
  current_period_end timestamptz,
  cancel_at_period_end bool default false,
  trial_end       timestamptz,
  seats           int default 1,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);
create unique index on public.vcard_subscriptions (user_id) where team_id is null;
```

### 24.3 Webhooks handled (`/api/stripe/webhook`)
- `checkout.session.completed` — create/update subscription row, set plan on `vcard_profile_ext`. **Also** handles physical-product orders (mode=payment) and verified-badge purchase (auto-approves Verified review).
- `customer.subscription.created|updated|deleted` — status sync.
- `invoice.payment_failed` — email user via Resend, set status `past_due`, after 3 retries downgrade to `free` + email + analytics event. **Profile data and customizations are preserved**, only Pro features (custom domain, multi-profile, etc.) are re-gated.
- `invoice.paid` — clear past_due.
- `customer.subscription.trial_will_end` — email 3 days before.
- `charge.refunded` — log + set order `refunded`.

### 24.4 Trial
- 14-day free trial on Pro/Team, no card required (Stripe Checkout `trial_period_days: 14, payment_method_collection: 'if_required'`).
- Trial banner in dashboard with countdown + "Add card" CTA.
- After trial expiry without card → seamlessly downgrade to Free (no lockout).

### 24.5 Upgrade / downgrade
- Use Stripe Billing Portal (`/account/billing` button → portal session). Proration on plan change handled by Stripe.
- Free→paid: redirect to checkout. Paid→free: schedule cancel at period end (`cancel_at_period_end=true`), retain features until period_end then enforce free limits gracefully (extra profiles archived, custom domain detached, branding restored).

### 24.6 Entitlements
`lib/entitlements.ts`:
```ts
export type Plan = 'free' | 'pro' | 'team' | 'enterprise';

export function entitlementsFor(plan: Plan, bonuses: { extraStorageBytes?: number } = {}) {
  const base = {
    free: {
      profilesMax: 1,
      pairedCardsMax: 1,
      storageBytes: 5_000_000_000,        // 5 GB
      seatsMax: 1,
      removeBranding: false,
      customDomain: false,
      customFontUpload: false,
      passwordProtected: false,
      multiProfileVariants: false,
      twoWayExchange: false,
      leadCaptureForms: false,
      apiAccess: false,
      webhooks: false,
      csvExport: false,
      weeklyDigest: false,
      // free-for-everyone
      allThemes: true,
      customCss: true,
      walletPass: true,
      embedWidget: true,
      analytics: true,
      contactCapture1Way: true,
      allSectionTypes: true,
    },
    pro: {
      profilesMax: 10,
      pairedCardsMax: Infinity,
      storageBytes: 50_000_000_000,       // 50 GB
      seatsMax: 1,
      removeBranding: true,
      customDomain: true,
      customFontUpload: true,
      passwordProtected: true,
      multiProfileVariants: true,
      twoWayExchange: true,
      leadCaptureForms: true,
      apiAccess: true,
      webhooks: true,
      csvExport: true,
      weeklyDigest: true,
      allThemes: true, customCss: true, walletPass: true, embedWidget: true,
      analytics: true, contactCapture1Way: true, allSectionTypes: true,
    },
    team: {
      profilesMax: Infinity,
      pairedCardsMax: Infinity,
      storageBytes: 250_000_000_000,      // 250 GB pooled
      seatsMax: 10,
      brandKit: true, teamRollup: true, rolePermissions: true,
      // inherits pro
      removeBranding: true, customDomain: true, customFontUpload: true,
      passwordProtected: true, multiProfileVariants: true, twoWayExchange: true,
      leadCaptureForms: true, apiAccess: true, webhooks: true, csvExport: true,
      weeklyDigest: true, allThemes: true, customCss: true, walletPass: true,
      embedWidget: true, analytics: true, contactCapture1Way: true, allSectionTypes: true,
    },
    enterprise: { /* same as team + sso, sla, custom seats */ } as any,
  }[plan];
  return {
    ...base,
    storageBytes: base.storageBytes + (bonuses.extraStorageBytes ?? 0),
  };
}
```
Server actions enforce on every write; client UI hides/disables locked controls and renders an inline "Pro" badge that opens the upgrade sheet. Free users **never** see "this is locked behind a paywall" on a customization control — those controls are simply available to all.

### 24.7 Storage bonuses (from card purchases)
- `vcard_profile_ext.bonus_storage_bytes bigint default 0`.
- Order webhook: for any `card-*` SKU, `bonus_storage_bytes += 1_000_000_000` capped at `25_000_000_000`.
- `entitlementsFor()` reads `bonus_storage_bytes` to compute final storage cap.

---

## 24b. Verified Badge (separate from plans)

A one-time, per-account identity check. Independent of Pro/Team. Adds the gold check next to the user's display name (matches mockup 01 — `Void Luxury Detailing ✓`).

### 24b.1 Acquisition paths
1. **Buy** — $5 one-time SKU `verified-badge` in shop.
2. **Earned** — automatically granted (skip $5) when the account purchases any `card-metal`, `card-custom`, `bundle-starter`, or `team-5pack` SKU.
3. **Manual / brand** — admin grants for known brands or via DMCA-resolved disputes.

### 24b.2 Required to use
- Custom-Art card SKU (anti-impersonation).
- Custom domain on apex (`acme.com` rather than `cards.acme.com`) — anti-phishing.
- Outbound webhooks delivering to non-HTTPS URLs.
- Optional: hide "@username" handle on profile (display name only).

### 24b.3 Verification flow
1. User initiates from `/account/verify` (or auto-redirected after qualifying purchase).
2. Choose method:
   - **Individual:** government ID front + selfie (uploaded to `vcard-private` bucket, encrypted at rest, deleted after review).
   - **Business:** business registration doc + matching domain ownership (TXT record).
   - **Brand owner:** trademark registration number.
3. Submission inserts into `vcard_verifications` (status=`pending`).
4. Admin reviews at `/admin/verifications`. Decision: `approved | rejected | needs_more_info`.
5. On approve: `vcard_profile_ext.verified = true`, granted-by + granted-at recorded, badge appears live, email sent.
6. On reject: refund $5 if paid (Stripe refund), email with reason, allow re-submit after 30d.
7. Verified can be revoked by admin (audit-logged) for ToS violations.

### 24b.4 Schema
```sql
create table public.vcard_verifications (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  method        text not null,            -- individual|business|brand|earned|manual
  status        text not null default 'pending', -- pending|approved|rejected|revoked
  documents     jsonb,                    -- [{kind, storage_path}] (private bucket)
  paid          boolean not null default false,
  stripe_payment_intent text,
  reviewer_id   uuid,
  reviewer_note text,
  reason        text,                     -- on rejection
  submitted_at  timestamptz default now(),
  decided_at    timestamptz,
  expires_at    timestamptz               -- yearly re-check for businesses (optional)
);
create unique index on public.vcard_verifications (user_id) where status in ('pending','approved');
```

### 24b.5 Anti-abuse
- Rate-limit submissions: 3 per account per 30 days.
- Auto-OCR check on ID name vs. account name (mismatch flags for human review).
- All ID images deleted from storage 24h after final decision (archive only hash).
- Verified badge revocation triggers `vcard_audit_log` entry + user email.

---

## 25. Apple Wallet & Google Wallet


**Phase 2 (post-launch month 2)** but specced now.

### Apple
- Pass type: `pass.com.ed5enterprise.vcard`. Generate `.pkpass` server-side using `passkit-generator`.
- Required certs (stored as base64 secrets): `APPLE_PASS_CERT`, `APPLE_PASS_KEY`, `APPLE_PASS_KEY_PASSPHRASE`, `APPLE_WWDR`.
- Endpoint: `GET /api/wallet/apple/[username].pkpass` — RSC route, signs on demand, sets `application/vnd.apple.pkpass`.
- Update push: Apple Wallet web service endpoints (`/v1/devices`, `/v1/passes/...`) registered behind `/api/wallet/apple/web/*`. On profile change, push update via APNs (`apn` lib).

### Google
- Use Google Wallet API + service account JWT. Class created once per profile via `walletobjects.v1.genericclass`. Object per pass.
- Endpoint: `GET /api/wallet/google/[username]` returns `https://pay.google.com/gp/v/save/{jwt}`.

Schema:
```sql
create table public.vcard_wallet_passes (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  provider     text not null,  -- apple|google
  serial       text not null,
  device_id    text,
  push_token   text,
  created_at   timestamptz default now(),
  unique (provider, serial)
);
```

---

## 26. Public Search & Directory

- **Postgres FTS** column on `vcard_profile_ext`:
  ```sql
  alter table public.vcard_profile_ext add column tsv tsvector
    generated always as (
      to_tsvector('english',
        coalesce(display_name,'') || ' ' || coalesce(bio,'') || ' ' || username || ' ' || coalesce(company,'')
      )
    ) stored;
  create index on public.vcard_profile_ext using gin(tsv);
  ```
- `/discover` public page — featured profiles + search + categories (auto-derived from `services` section tags + manual curation).
- API: `GET /api/discover?q=...&category=...&cursor=...` — Edge runtime.
- Indexed in sitemap (top 10k by views) for SEO.

---

## 27. Email & Deliverability

**Provider:** Resend primary, SMTP fallback (matches mmostudio/website pattern).

**Domain auth:** Use ED5 ecosystem domain `mail.ed5enterprise.com`. SPF: `v=spf1 include:_spf.resend.com -all`. DKIM: provided by Resend, add CNAME. DMARC: `v=DMARC1; p=quarantine; rua=mailto:dmarc@ed5enterprise.com`.

**Templates** (`emails/` using `@react-email/components`):
| ID | Trigger | To |
|---|---|---|
| `auth-magic-link` | login request | user |
| `auth-verify` | signup | user |
| `welcome` | first login complete | user |
| `trial-ending` | T-3d | user |
| `payment-failed` | Stripe webhook | user |
| `plan-downgraded` | retry exhausted | user |
| `order-receipt` | shop checkout completed | buyer |
| `order-shipped` | admin adds tracking | buyer |
| `contact-captured` | someone fills exchange/form | profile owner |
| `nfc-paired` | first pair success | user |
| `domain-live` | custom domain SSL ready | user |
| `team-invite` | team owner invites member | invitee |
| `password-page-access` | gated profile access requested | owner |
| `weekly-digest` | every Mon 9am UTC | user (Pro) |
| `data-export-ready` | GDPR export complete | user |
| `account-deletion-confirm` | user requests delete | user |

All templates pass spam-check via Resend's built-in linter; CI test renders each + asserts subject ≤ 50 chars + has plain-text alternative.

---

## 28. Backups & Disaster Recovery

- **Supabase PITR** enabled (Pro tier) — 7d window.
- **Weekly logical dump** via GitHub Action `pg_dump` → encrypted S3 (`s3://ed5-backups/vcard/YYYY-MM-DD.sql.gz.enc`), 90-day retention, age-encrypted.
- **Storage backup**: nightly `rclone sync` of `vcard-public` + `vcard-private` to S3 Glacier IR.
- **Runbook:** `docs/RUNBOOK_RESTORE.md` with exact commands for: PITR restore, single-table restore, storage restore, DNS failover.
- **RTO:** 4h. **RPO:** 1h (PITR) / 24h (storage).
- Quarterly restore drill (calendar reminder).

---

## 29. GDPR / CCPA Data Rights

- **Export** (`/account/export`): user clicks → enqueues job (Vercel cron-like via Supabase Edge Function). Job collects all rows from `vcard_*` tables where `user_id = me`, plus storage objects, zips, signs URL valid 7d, sends `data-export-ready` email. Logs to `vcard_dsr_log`.
- **Delete** (`/account/delete`): 6-digit email confirmation → `status='pending_deletion', delete_at = now() + 30d`. Cron deletes after 30d. User can cancel within window.
- **Cookie banner**: required for non-essential analytics (PostHog, FB Pixel). Stored consent in `vcard_consent_log (user_id|cookie_id, choice, timestamp, ip_hash, ua)`.
- **DPA & subprocessor list** in `/legal/dpa`.

Schema:
```sql
create table public.vcard_dsr_log (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null,
  kind       text not null,      -- export|delete
  status     text not null,
  url        text,
  created_at timestamptz default now(),
  completed_at timestamptz
);
create table public.vcard_consent_log (
  id         bigserial primary key,
  cookie_id  text,
  user_id    uuid,
  choice     jsonb not null,     -- {analytics:bool,marketing:bool}
  ip_hash    text,
  ua         text,
  created_at timestamptz default now()
);
```

---

## 30. Username Reservation, Moderation, Reports

### 30.1 Reserved usernames
`lib/reserved-usernames.ts` — block: `admin, api, app, www, mail, support, login, signup, c, s, u, shop, pricing, account, dashboard, settings, blog, docs, help, legal, status, vc, void, voidcard, ed5, dotcards` and a curated profanity list. Server-side check on signup + rename.

### 30.2 Profanity / brand protection
- Run username + display_name + bio through `bad-words` + custom denylist on save.
- Trademarked brands list (top 200) → flag for review, not auto-block.

### 30.3 Reports
```sql
create table public.vcard_reports (
  id           uuid primary key default gen_random_uuid(),
  reporter_id  uuid,
  reporter_ip  text,
  target_kind  text not null,     -- profile|media|shortlink
  target_id    text not null,
  reason       text not null,     -- spam|abuse|impersonation|dmca|nsfw|other
  details      text,
  status       text not null default 'open',  -- open|reviewing|actioned|dismissed
  resolution   text,
  created_at   timestamptz default now()
);
```
- Public "Report" link on every profile (Turnstile-gated).
- Admin queue at `/admin/reports`. Actions: hide profile, suspend user, takedown media.
- DMCA dedicated form at `/legal/dmca` (counter-notice flow). Statutorily required fields.

---

## 31. Onboarding

After first login → `/onboarding` 5-step wizard (skippable):
1. **Claim username** — slug input w/ live availability + reserved check.
2. **Upload avatar** — direct image picker, crop circle.
3. **Pick a vibe** — 6 starter section stacks (see §35) + "Blank canvas".
4. **Add up to 3 links** — quick rows.
5. **Pair NFC** — "Have a card?" → camera scan or manual entry; "Skip — buy one later" CTA → shop.

Progress persisted in `vcard_profile_ext.onboarding_state jsonb`. Confetti + share sheet on finish.

---

## 32. Mobile Native Feel

- **Safe areas:** `env(safe-area-inset-bottom)` on bottom nav + sheets; `viewport-fit=cover` in `<meta>`.
- **Pull-to-refresh:** custom hook on Gallery + Insights.
- **Haptics:** `navigator.vibrate(10)` on tab change, `[10,40,10]` on publish.
- **Swipe gestures:** bottom-nav swipe between tabs (framer-motion `pan` with directional snap).
- **Standalone PWA:** detect via `display-mode: standalone`, hide install banner, route iOS back button via `history.length` heuristic.
- **App icon shortcut targets** in `manifest.ts`: Edit Profile, Insights, Pair Card.
- **Web Share Target API** registered → external apps can share-into VoidCard for gallery upload.
- **Reduced motion:** all framer-motion variants check `useReducedMotion()`.
- **Reduced transparency:** disable gold glow when `prefers-reduced-transparency: reduce`.

---

## 33. QR Codes & Contact Exchange

### 33.1 QR
- `lib/qr.ts` uses `qr-code-styling` server-side (canvas + `node-canvas`).
- Branded: gold dots, rounded corners, center logo (avatar or VOID monogram), background transparent.
- Endpoints:
  - `GET /api/qr/profile/[username].png` — Edge, cached 1d.
  - `GET /api/qr/short/[slug].png`
- Share sheet: profile QR + "Save image" + "Print card" link.

### 33.2 Contact exchange (`/exchange/[token]`)
Two flows:
1. **One-way (default):** Visitor scans → `/u/{username}` → "Save Contact" downloads `.vcf` AND opens optional form to leave their info → `vcard_contacts` insert + email owner.
2. **Two-way pro:** Owner taps "Exchange" in their app → server issues `exchange_token` (JWT, 15min). Owner shows QR. Visitor scans → `/exchange/[token]` → form (name, email, phone, optional message). On submit:
   - Visitor gets owner's `.vcf`.
   - Owner gets visitor's contact in `vcard_contacts` w/ `source='exchange'`.
   - Both parties opt-in via consent checkbox (GDPR text).

Schema:
```sql
create table public.vcard_exchange_tokens (
  token       text primary key,        -- random 32 chars
  owner_id    uuid not null,
  expires_at  timestamptz not null,
  used_count  int default 0,
  max_uses    int default 50,
  created_at  timestamptz default now()
);
```

---

## 34. Embed Widget & Public API

### 34.1 Embed
- `<script src="https://vcard.ed5enterprise.com/embed.js" data-user="@voiddetail" data-mode="card|button|full"></script>`.
- Renders into shadow DOM (no CSS leaks). Three modes:
  - `button` — small "Save my contact" pill.
  - `card` — compact profile card (header + 3 links).
  - `full` — phone-frame iframe of `/u/{username}`.
- Respects parent page width; lazy-loads on intersection.
- Endpoint serves Edge-cached JS (immutable filename `embed.[hash].js`, 1y cache).

### 34.2 Public API
- REST under `/api/v1/*`, Bearer token auth.
- Endpoints: `GET /v1/profile`, `PATCH /v1/profile`, `GET /v1/taps`, `GET /v1/contacts`, `POST /v1/shortlinks`, `GET /v1/insights/summary`.
- Rate limit: 60 req/min/key (Pro), 600 req/min (Team).
- OpenAPI spec at `/api/v1/openapi.json` + Scalar UI at `/docs/api`.

Schema:
```sql
create table public.vcard_api_keys (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  name          text not null,
  prefix        text not null,        -- first 8 chars (display)
  hash          text not null,        -- sha256 of full key
  scopes        text[] not null default '{read}',
  last_used_at  timestamptz,
  revoked_at    timestamptz,
  created_at    timestamptz default now()
);
```

### 34.3 Outbound webhooks
```sql
create table public.vcard_webhooks (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null,
  url         text not null,
  events      text[] not null,    -- tap.created, contact.created, order.paid, ...
  secret      text not null,      -- hmac key
  enabled     bool default true,
  failure_count int default 0,
  created_at  timestamptz default now()
);
create table public.vcard_webhook_deliveries (
  id          bigserial primary key,
  webhook_id  uuid not null,
  event       text not null,
  payload     jsonb not null,
  status_code int,
  response    text,
  attempt     int default 1,
  next_retry_at timestamptz,
  created_at  timestamptz default now()
);
```
Delivery worker: exponential backoff (1m,5m,30m,2h,12h,24h), HMAC `X-VoidCard-Signature: t=...,v1=hex(sha256(secret, t+'.'+body))`. Disable after 7 days of failures + email user.

---

## 35. Vibe Templates (starter section stacks)

Stored in `lib/templates/*.ts` as ordered arrays of section presets. Shipped:
- **Detailer / Auto** (matches mockups: header, primary_actions, quick_actions, hero_media before/after, highlights[Book/Services/Gallery/Reviews], cta[Pay Deposit])
- **Realtor** (header, quick_actions, gallery[listings], links[MLS/Tours/Site], reviews, cta[Schedule])
- **Creator / Influencer** (header, primary_actions, links[Insta/TikTok/YT], embed[YouTube], cta[Tip Jar])
- **Restaurant** (header, quick_actions, hero_media[menu cover], links[Menu/Reserve/Order], map, reviews)
- **Barber / Stylist** (header, quick_actions, gallery[cuts], services[packages], cta[Book Now])
- **Founder / Exec** (header, links[Calendly/LinkedIn/X/Site], text[About], cta[Book Intro])
- **Blank canvas** (header only)

Each is a one-click apply during onboarding or in the editor "Add Template" sheet (with merge or replace option).

---

## 36. Light Theme Variant ("Onyx Ivory")

Sister preset to Onyx Gold for users who want light:
- bg `#FAF7F0`, surface `#FFFFFF`, text `#1A1813`, primary `#A47A2C`, border `rgba(164,122,44,0.18)`.
- Same component shapes, only token swap. 12 presets total (Onyx Gold, Onyx Ivory, Aurora, Glass, Mono Dark, Mono Light, Brutalist, Neon, Sunset, Mint, Carbon, Holographic).

---

## 37. SEO / Sitemap details

- **Paginated sitemap:** `/sitemap.xml` is an index pointing to `/sitemap/profiles-1.xml`, `-2.xml`, … each w/ ≤ 5,000 URLs (well under 50k limit, gives headroom).
- Password-protected & hidden profiles excluded from sitemap and add `<meta name="robots" content="noindex,nofollow">`.
- `hreflang` deferred (single-locale v1) — documented in `docs/I18N.md`.
- Soft 404: deleted users → `/u/[username]` returns 410 + page "Profile no longer available" instead of hard 404, preserves NFC chip equity.

---

## 38. Performance Hardening

- **LCP:** preload avatar via `<link rel="preload" as="image" fetchpriority="high">` injected by `<ProfileRenderer>`. First gallery image gets `priority`. Blurhash placeholder via `plaiceholder` at upload time (stored in `vcard_media.blurhash`).
- **Edge cache:** `/c/[id]`, `/s/[slug]` use Upstash Redis read-through (60s TTL, negative cache 10s) keyed by id/slug.
- **Bundle budget:** `size-limit` config:
  ```json
  [
    { "path": ".next/static/chunks/pages/u-*.js", "limit": "70 KB" },
    { "path": ".next/static/chunks/pages/dashboard-*.js", "limit": "200 KB" }
  ]
  ```
  CI fails on regression.
- **RUM regressions:** Vercel Speed Insights p75 dashboard checked weekly; any 10% LCP regression files an issue.

---

## 39. Accessibility (WCAG 2.2 AA)

- All interactive elements ≥44×44 hit area (mobile).
- Color contrast verified: text on Onyx surface = 11:1 (passes AAA). Gold on black for icons = 8:1 (AA).
- `axe-core` Playwright integration; CI fails on serious violations.
- Keyboard map for editor: arrow keys reorder focused section, Enter opens editor sheet, Esc closes.
- Skip links on every page (`Skip to content`).
- Form errors `aria-live="polite"`.
- Reduced-motion tested.

---

## 40. Error Handling & Observability

- `app/error.tsx` (segment-aware), `app/global-error.tsx`, `app/not-found.tsx`.
- Per route group: `(app)/error.tsx`, `admin/error.tsx`, `(marketing)/error.tsx`.
- Sentry: source maps uploaded, **session replay on dashboard only** with all inputs masked + storage masked. Disabled on `/u/*` (privacy + perf).
- Synthetic uptime: Better Stack monitor on `/api/health`, `/u/_demo`, `/c/_demo`.
- SLO: 99.9% on auth + `/c/*` + `/s/*`. 99.5% on dashboard.
- Status page: `status.ed5enterprise.com` shared with ecosystem.

---

## 41. Tap Fraud / Abuse Defense

- Dedupe layer (§23) — first defense.
- Rate-limit `/c/[id]` to 30 req/min per IP (Upstash). Soft fail (still redirect) but skip logging.
- Bot UA list (`bot|crawler|spider|preview|headless`) — redirect but never log.
- Daily cron flags profiles with > 10× their 7d-avg taps for review.
- Honeypot field on lead-capture forms; submit w/ honeypot filled → 200 OK but ignore.
- Turnstile required on contact/exchange/report forms.

---

## 42. Refunds & Tax

- `charge.refunded` webhook → set order `refunded`, email customer, log.
- Stripe Tax `automatic_tax: true` on Checkout. Register thresholds in Stripe Tax dashboard (US states, EU OSS, UK).
- Display tax in checkout, store in `vcard_orders.tax_cents`.
- Issue downloadable receipt with tax breakdown (PDF via `@react-pdf/renderer`) attached to receipt email.

---

## 43. Audit Log & Versioning

```sql
create table public.vcard_audit_log (
  id          bigserial primary key,
  actor_id    uuid,
  actor_role  text,
  action      text not null,           -- e.g. profile.publish, admin.user.role
  target_kind text,
  target_id   text,
  before      jsonb,
  after       jsonb,
  ip_hash     text,
  ua          text,
  created_at  timestamptz default now()
);
create index on public.vcard_audit_log (actor_id, created_at desc);
```
- All admin mutations + profile publishes logged.
- Admin export to CSV.
- **Section-schema version**: `vcard_profile_ext.sections_version int default 1`. Renderer dispatches per version → forward-compatible migrations in `lib/sections/migrations.ts`.

---

## 44. Changelog & Marketing Surfaces

- `/changelog` MDX-driven, RSS feed `/changelog/feed.xml`, "What's new" badge in dashboard topbar (clears on read, stored in `localStorage`).
- `/blog` MDX too, hosted in `content/blog/*.mdx`.
- `/compare/dotcards` SEO landing page (factual feature comparison table).
- `/templates` showcase (vibe templates with live demos).

---

## 45. Updated Env Vars (additions)

Append to `.env.example`:
```bash
# === Custom domains ===
VERCEL_API_TOKEN=
VERCEL_PROJECT_ID=
VERCEL_TEAM_ID=

# === Stripe Subs ===
STRIPE_PRICE_PRO_M=
STRIPE_PRICE_PRO_Y=
STRIPE_PRICE_TEAM_M=
STRIPE_PRICE_TEAM_Y=
STRIPE_BILLING_PORTAL_RETURN_URL=https://vcard.ed5enterprise.com/account/billing

# === Wallet (phase 2) ===
APPLE_PASS_TYPE_ID=pass.com.ed5enterprise.vcard
APPLE_PASS_TEAM_ID=
APPLE_PASS_CERT=base64...
APPLE_PASS_KEY=base64...
APPLE_PASS_KEY_PASSPHRASE=
APPLE_WWDR=base64...
GOOGLE_WALLET_ISSUER_ID=
GOOGLE_WALLET_SA_KEY=base64-json...

# === CDN ===
BUNNY_CDN_HOSTNAME=cdn.vcard.ed5enterprise.com
BUNNY_CDN_TOKEN=

# === Backups ===
BACKUP_S3_BUCKET=ed5-backups
BACKUP_S3_REGION=us-east-1
BACKUP_S3_KEY=
BACKUP_S3_SECRET=
BACKUP_AGE_RECIPIENT=age1...

# === Search / Discovery ===
DISCOVER_FEATURED_REFRESH_CRON=0 */6 * * *

# === Internal ===
ADMIN_IMPERSONATION_HMAC=
CRON_SHARED_SECRET=
```

---

## 46. New Migrations (full list)

| File | Purpose |
|---|---|
| `0001_vcard_init.sql` | profile_ext, sections, theme, draft, verified, password_hash, bonus_storage_bytes, onboarding_state |
| `0002_vcard_media.sql` | media + buckets policy hooks |
| `0003_vcard_cards.sql` | cards + nfc_jti + lifecycle |
| `0004_vcard_shortlinks.sql` | shortlinks + indexes |
| `0005_vcard_taps.sql` | taps + dedupe materialized view |
| `0006_vcard_shop.sql` | products, orders |
| `0007_vcard_storage.sql` | storage buckets + RLS for storage.objects |
| `0008_vcard_subscriptions.sql` | subscriptions, webhooks for plan |
| `0009_vcard_teams.sql` | teams, members, invites |
| `0010_vcard_custom_domains.sql` | domains |
| `0011_vcard_search.sql` | tsvector + indexes |
| `0012_vcard_dsr_consent.sql` | dsr_log, consent_log |
| `0013_vcard_reports_audit.sql` | reports, audit_log |
| `0014_vcard_api_webhooks.sql` | api_keys, webhooks, webhook_deliveries |
| `0015_vcard_wallet.sql` | wallet_passes |
| `0016_vcard_exchange.sql` | exchange_tokens |
| `0017_vcard_verifications.sql` | verifications (Verified Badge, §24b) |
| `0018_vcard_rls.sql` | consolidated RLS for all tables |
| `0019_vcard_seed.sql` | seed: reserved usernames flag table, demo profile, default products (§10.1) |

---

## 47. Updated Definition of Done (additions)

- [ ] Free tier: every customization control (themes, custom CSS, all section types, wallet pass, embed, analytics) works without upgrade.
- [ ] Pro feature gates only block: custom domain, branding removal, multi-profile, API/webhooks, custom font, password protection, 2-way exchange, lead forms, CSV export, weekly digest.
- [ ] Verified badge flow: $5 purchase + admin review + auto-grant on qualifying card SKUs all tested.
- [ ] Card purchase grants +1 GB lifetime storage (capped at +25 GB) — verified by webhook integration test.
- [ ] Storage limits enforced per plan; over-quota uploads rejected with friendly message.
- [ ] Custom domain end-to-end (add → verify → SSL → live) on a real test domain.
- [ ] Stripe subscription end-to-end (signup → trial → upgrade → downgrade → cancel → reactivate).
- [ ] Apple `.pkpass` installs on real iPhone; updates push when profile edited.
- [ ] Google Wallet pass saves on real Android.
- [ ] `/discover` returns relevant results in <100ms p95.
- [ ] All 16 emails render correctly in Gmail, Apple Mail, Outlook (use Resend preview + Litmus once).
- [ ] PITR restore drill executed and documented.
- [ ] GDPR export ZIP contains every row + every storage object owned by the user.
- [ ] Reserved username list blocks all 30+ entries.
- [ ] DMCA form accepts and creates `vcard_reports` row.
- [ ] Onboarding wizard completion rate tracked in PostHog funnel.
- [ ] Safe-area insets correct on iPhone 14/15 Pro and Android gesture nav.
- [ ] Branded QR PNG renders with logo center + gold dots.
- [ ] Embed widget loads on a 3rd-party page in <50 KB.
- [ ] Public API: create key, hit `/v1/profile`, rotate key, revoke key.
- [ ] Outbound webhook fires on tap.created, signature verified by sample handler.
- [ ] All 7 vibe templates apply cleanly to a fresh profile.
- [ ] Light theme (Onyx Ivory) passes AAA contrast.
- [ ] Sitemap index returns ≤ 5k URLs per shard.
- [ ] axe-core: 0 serious violations site-wide.
- [ ] `error.tsx` / `not-found.tsx` exist for every route group; each tested by forced throw.
- [ ] Tap fraud dedupe verified (10 rapid taps from same IP = 1 logged tap).
- [ ] Tax displayed at checkout; PDF receipt downloadable.
- [ ] Audit log captures admin role changes + profile publish.
- [ ] Changelog page live; first 3 entries written.

---

## 48. Growth & Funnel

A funnel-tight model. Every section has measurable analytics events.

### 48.1 Funnel stages & target conversion
| Stage | Event | Target |
|---|---|---|
| Visit landing | `marketing_view` | 100% |
| Try sandbox | `sandbox_start` | 35% of visits |
| Sign up | `auth_signup_complete` | 60% of sandbox |
| Publish profile | `profile_publish` | 80% of signups |
| First share | `share_action` | 60% of publishers |
| Buy card | `order_paid` (any card SKU) | 8% of publishers |
| Pro upgrade | `sub_started` plan=pro | 4% of publishers |
| Team upgrade | `sub_started` plan=team | 0.6% |

### 48.2 Sandbox / Try-before-signup (`/try`)
- Editor mounts with localStorage-backed draft, no auth required.
- "Save your page" CTA \u2192 sign up \u2192 hydrate draft into `vcard_profile_ext.sections_draft`.
- Cookie `vcard_sandbox_id` carried into signup for attribution.
- Goal: zero-friction wow moment; prefilled with user's avatar from Google OAuth if signing up that way.

### 48.3 Referral program (`vcard_referrals`)
```sql
create table public.vcard_referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referee_id  uuid references auth.users(id) on delete set null,
  code        text unique not null,           -- 8-char nano id
  channel     text,                            -- direct|email|qr|social
  status      text not null default 'visited', -- visited|signed_up|converted
  reward_cents int default 0,
  rewarded_at timestamptz,
  created_at  timestamptz default now()
);
```
- $5 store credit to referrer when referee buys any card SKU. Capped at $100 per referrer per year (anti-fraud).
- Display as `vcard_store_credits` ledger, applied automatically at checkout via Stripe coupon.

### 48.4 Cart abandonment
- Listen to `checkout.session.expired` + a 1h delayed cron after `checkout.session.created` without completion.
- Resend email `cart-abandon` with single-CTA resume link; UTM `?src=cart_abandon`.
- A/B test: 1h vs 4h vs 24h send.

### 48.5 Product reviews (`vcard_product_reviews`)
```sql
create table public.vcard_product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.vcard_products(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  order_id   uuid references public.vcard_orders(id),     -- verified-buyer flag
  rating     int not null check (rating between 1 and 5),
  title      text,
  body       text,
  approved   boolean default false,
  created_at timestamptz default now(),
  unique (product_id, user_id)
);
```
- Email at T+10d after delivery requesting review (single click 1-5 stars + optional comment).
- "Verified buyer" badge if `order_id` present.
- Admin moderation queue.

### 48.6 In-product notifications (`vcard_notifications`)
```sql
create table public.vcard_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  kind    text not null,             -- contact_saved|tap|review_request|achievement|system
  title   text not null,
  body    text,
  url     text,
  read_at timestamptz,
  created_at timestamptz default now()
);
create index on public.vcard_notifications (user_id, read_at);
```
- Bell icon in dashboard header (mockup 04). Realtime via Supabase `postgres_changes`.
- Web push (Push API) for tap and contact-saved events; opt-in during onboarding step 5.

### 48.7 Achievements & streaks (`vcard_achievements`)
| Code | Trigger | Reward |
|---|---|---|
| `first_publish` | profile_publish (first time) | confetti + share sheet |
| `first_tap` | tap.created (first) | toast |
| `tap_10` / `tap_100` / `tap_1k` | thresholds | badge on profile (optional) |
| `contact_saved_1` | first save | toast + share sheet |
| `pro_member` | sub started | gold ribbon in dashboard |
| `streak_7` | 7-day login | "On Fire" badge |
- Stored as `(user_id, code, awarded_at)`.
- Public profile shows opt-in badge cluster (toggle in settings).

### 48.8 Usage-based Pro prompts
Triggered server-side on free accounts:
| Trigger | Prompt |
|---|---|
| storage \u2265 80% of cap | "You're at 4.2 GB / 5 GB. Buy a card (+1 GB) or go Pro (50 GB)." |
| 1-way form \u2265 5 submissions | "Auto-capture both sides with 2-way Exchange (Pro)." |
| 3+ profile drafts attempted | "Multiple personas? Multi-profile is Pro." |
| 50+ taps in a week | "Custom domain makes you 2\u00d7 more memorable. Try Pro." |
- Each prompt: shown max 1\u00d7 / 14 days / type. Logged to `vcard_prompts_shown`.

### 48.9 Cancel flow (`/account/cancel` interstitial)
Before Stripe portal cancel:
1. **Pause** \u2014 60 days at $0, profile stays live, downgrades after.
2. **Discount** \u2014 50% off for 3 months (auto-applied coupon `WIN_BACK_50`).
3. **Downgrade to annual** \u2014 if monthly user, offer yearly at locked-in lower rate.
4. **Tell us why** \u2014 1-click reasons (too expensive / not using / missing feature / other) \u2192 `vcard_churn_survey`.
5. Final "Cancel anyway" submits to Stripe.
- Stops ~25% of cancels in benchmarks; logged as `cancel_intent` event.

### 48.10 Re-engagement
- T+7d after signup with no publish: email "Need help? Pick a vibe template."
- T+30d inactive: "Your profile got N taps this month" (only if N>0; else "Add a section like \u2018Reviews\u2019").
- T+3d after trial expiry without upgrade: launch coupon `LAUNCH_FIRST_MONTH_FREE`.

### 48.11 Email schedule (Resend)
| Trigger | Subject | Delay |
|---|---|---|
| signup_complete | "Claim your first link" | 0 |
| profile_publish | "You're live \u2014 here's your QR" | 0 |
| 1st tap received | "Someone tapped your card" | realtime |
| trial T-3d | "3 days of Pro left" | T-3d |
| trial expired | "Free works, but here's 25% off Pro" | T+3d |
| order shipped | "Your VoidCard ships today" | shipping |
| order delivered T+10d | "How's your card? Quick review?" | review |
| cart abandon | "You left this behind" | 1h |
| weekly digest | "Your week on VoidCard" | Mon 09:00 user-local |
| churn 30d inactive | "Your profile got N taps" | 30d |

### 48.12 Funnel analytics dashboard (admin)
- `/admin/funnel` shows weekly cohort retention + step-by-step conversion.
- PostHog provides primary funnel; mirror to Supabase `vcard_funnel_events` for SQL access.

### 48.13 Migrations to add
- `0020_vcard_referrals.sql`
- `0021_vcard_product_reviews.sql`
- `0022_vcard_notifications.sql`
- `0023_vcard_achievements.sql`
- `0024_vcard_prompts_shown.sql`
- `0025_vcard_churn_survey.sql`
- `0026_vcard_funnel_events.sql`

### 48.14 Definition of Done (funnel-specific)
- [ ] `/try` sandbox publishes a usable preview without auth.
- [ ] Referral link credits store-credit on first card purchase.
- [ ] Cart-abandon email sends and resumes Stripe checkout.
- [ ] Reviews appear on PDP with verified-buyer badge.
- [ ] Bell-icon notifications realtime within 2s of event.
- [ ] At least 6 achievements awarded correctly.
- [ ] Storage \u2265 80% prompt fires once (not on every visit).
- [ ] Cancel flow shows 4 retention offers before Stripe portal.
- [ ] Win-back coupon auto-applies for downgraded users for 30 days.

