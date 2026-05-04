# PWA + SEO Upgrade Plan

## Current baseline (from repo)
- React 18 + Vite 4 app with static hosting configuration (`netlify.toml`, `firebase.json`).
- No PWA tooling configured yet (no web app manifest, no service worker registration in `src/main.jsx`, and no Workbox/Vite PWA plugin in `package.json`).
- SPA routes exist (`react-router-dom`), which means indexing + metadata must be deliberate for SEO.

---

## Goals
1. Make the app installable as a Progressive Web App (PWA).
2. Improve crawlability, indexing, and search snippets.
3. Raise mobile performance and Core Web Vitals.
4. Add observability so we can track SEO and PWA impact after launch.

---

## Phase 1 — Foundation (Week 1)

### 1) Define KPIs and acceptance criteria
Track before/after and set pass thresholds:
- **Lighthouse PWA**: >= 90
- **Lighthouse SEO**: >= 95
- **LCP**: < 2.5s (mobile)
- **INP**: < 200ms
- **CLS**: < 0.1
- **Index coverage**: all key pages indexed

### 2) Add technical SEO prerequisites
- Create `public/robots.txt` with allow rules and sitemap reference.
- Generate `public/sitemap.xml` with canonical URLs:
  - `/`
  - `/login`
  - `/store`
  - `/shop`
  - other high-value public routes
- Add canonical URL support in `<head>`.
- Ensure all public pages include unique:
  - `<title>`
  - `<meta name="description">`
  - Open Graph + Twitter tags

### 3) Metadata architecture
- Adopt a reusable head helper (e.g., `react-helmet-async`) for per-route metadata.
- Build a central metadata map keyed by route.
- Add fallback/default metadata for unknown paths (404-friendly).

Deliverables:
- Robots + sitemap live.
- Every indexable route has custom title/description/canonical.

---

## Phase 2 — PWA Enablement (Week 2)

### 1) Add manifest + app icons
- Create `public/manifest.webmanifest` with:
  - `name`, `short_name`, `theme_color`, `background_color`
  - `display: standalone`
  - `start_url: /`
  - maskable icons (192x192, 512x512)
- Add icon set + splash-safe assets.

### 2) Add service worker strategy
Recommended path for this Vite app:
- Install and configure `vite-plugin-pwa`.
- Use `registerType: 'autoUpdate'`.
- Cache strategy:
  - **App shell/static assets**: precache (revisioned by Vite output).
  - **Images/fonts**: stale-while-revalidate.
  - **API calls**: network-first with short timeout fallback.
- Add offline fallback page for key UX flows.

### 3) Registration and update UX
- Register service worker in `src/main.jsx`.
- Show lightweight “New version available” prompt when update is ready.
- Add “You are offline” UX messaging on critical pages.

Deliverables:
- Install prompt works on supported devices.
- Offline behavior is graceful and testable.

---

## Phase 3 — SEO Quality & Content (Week 3)

### 1) Semantic and accessibility improvements
- Ensure single `<h1>` per page and proper heading hierarchy.
- Add descriptive `alt` text for meaningful images.
- Improve link anchor clarity (avoid generic “click here”).

### 2) Structured data
- Add JSON-LD in `index.html` or per-route metadata helper:
  - `Organization`
  - `WebSite`
  - `BreadcrumbList` where relevant
  - `Product` for commerce pages if applicable

### 3) URL and indexing hygiene
- Confirm noindex for private/auth-only pages (profile/settings dashboards).
- Keep public marketing pages indexable.
- Normalize canonical format (https, preferred host, no duplicate slashes).

Deliverables:
- Rich results eligibility improvements.
- Cleaner indexed page set.

---

## Phase 4 — Performance + Core Web Vitals (Week 4)

### 1) JavaScript delivery
- Route-level code splitting via dynamic imports for heavier pages.
- Defer non-critical scripts.
- Remove dead code/assets and large unused dependencies.

### 2) Media optimization
- Convert large PNGs to WebP/AVIF where practical.
- Serve responsive image sizes.
- Set explicit width/height to reduce CLS.

### 3) Rendering optimizations
- Preload critical fonts and hero assets.
- Reduce layout shifts in header/profile components.
- Audit expensive React renders in key routes.

Deliverables:
- Mobile CWV targets met on top landing pages.

---

## Phase 5 — Validation, Release, and Monitoring (Week 5)

### 1) QA checklist
- Lighthouse (mobile + desktop) on:
  - Home
  - Store/shop
  - Key public profile path
- Manual install test:
  - Android Chrome
  - iOS Safari (Add to Home Screen behavior)
- Offline flow test for primary navigation.

### 2) Search console + analytics
- Verify domain in Google Search Console.
- Submit sitemap.
- Monitor:
  - indexing status
  - Core Web Vitals report
  - enhancement warnings (structured data)
- Track CTR, impressions, and top queries.

### 3) Rollout strategy
- Launch behind staged deployment if available.
- Monitor errors for 72 hours post-release.
- Keep fast rollback path (disable SW updates if severe bug).

---

## Implementation Backlog (ticket-ready)

### Epic A: PWA
- [ ] Add `vite-plugin-pwa` and config.
- [ ] Add `manifest.webmanifest` + icon assets.
- [ ] Register SW in `src/main.jsx`.
- [ ] Add offline fallback route/page.
- [ ] Add update notification UI.

### Epic B: Technical SEO
- [ ] Add `robots.txt`.
- [ ] Add/generated `sitemap.xml`.
- [ ] Add per-route metadata helper.
- [ ] Add canonical + OG + Twitter tags on public routes.
- [ ] Add noindex on private routes.

### Epic C: Structured Data
- [ ] Add Organization JSON-LD.
- [ ] Add Website JSON-LD.
- [ ] Add Product/Breadcrumb JSON-LD where valid.

### Epic D: Performance
- [ ] Implement route code splitting.
- [ ] Compress/convert large image assets.
- [ ] Add performance budgets to CI (Lighthouse CI optional).

---

## Risks and mitigations
- **Service worker caching stale data** -> use conservative runtime caching and auto-update prompt.
- **SEO regressions on SPA routes** -> enforce metadata coverage in PR checklist.
- **Indexing private pages** -> explicit robots/meta noindex policy for authenticated routes.
- **Large image payloads** -> prioritize top-traffic pages first for compression.

---

## Suggested ownership
- Frontend engineer: PWA config, SW behavior, metadata plumbing.
- Design/content: titles, descriptions, social cards.
- QA: install/offline and Lighthouse validation.
- Product/marketing: KPI review and search console monitoring.
