# User Page Optimization Plan

VoidCard's highest-value web performance target is the public user profile route: `/u/[username]`. It is the first page loaded from NFC taps, shared links, QR codes, embeds, and search results, so speed directly affects the card owner's perceived professionalism.

## Goals

- Mobile Lighthouse performance >= 95 for `/u/demo` and representative profile pages.
- Public profile first-load JavaScript under 70 KB gzipped for simple link-card profiles.
- Cached public profile TTFB under 100-200 ms on production infrastructure.
- LCP under 1.5 s on mobile for image-backed profiles, then tune toward the build-plan 1.0 s target.
- Keep password-protected, draft, owner-only, and gated views private and uncached.

## Current Findings

- `apps/web/app/u/[username]/page.tsx` now uses a 60-second public profile data cache. Normal profiles avoid password cookies and request headers unless they are needed for protected unlock or active A/B variant selection.
- Public tap rendering work has moved off the HTML path: anonymous render no longer calls `getUser()`, tap recording runs after paint, variant views increment from the analytics endpoint, and webhook queueing is no longer in the profile page response.
- Section rendering skips the client motion island when `animation` is `none`, so simple profiles do not hydrate `framer-motion` for static sections.
- Public section, gallery, and store images now use the shared profile image wrapper. Trusted app/CDN hosts go through Next image optimization, while arbitrary owner-provided external URLs fall back safely.
- The service worker already stale-while-revalidates `/u/*`, but server-side caching is still the larger missing win.
- Lighthouse CI exists, but the current config is desktop-only and performance is a warning at 0.85 instead of enforcing the public-profile mobile budget.

## Execution Phases

### Phase 1: Baseline and Low-Risk JavaScript Reduction

- Capture production build output for `/u/[username]` first-load JS.
- Run Lighthouse mobile and desktop on `/u/demo` and one heavy seeded profile.
- Render non-animated profile sections without the client `framer-motion` wrapper.
- Keep animated sections feature-complete by loading the motion island only when a section opts into animation.

### Phase 2: Cache Public Profile HTML

- Split normal anonymous published profiles from private cases.
- Make unprotected public profile data cacheable with `unstable_cache` and profile-specific tags.
- Revalidate public profile paths/tags from edit, settings, onboarding publish, font, variant, admin, verification, and scheduled publish actions.
- Preserve `private, no-store` behavior for password-protected profiles, preview/draft modes, and unlock flows.

### Phase 3: Move Analytics Off Render

- Move `/u/*` tap recording to an Edge analytics endpoint triggered after first paint with `sendBeacon` or `fetch(..., { keepalive: true })`.
- Avoid `getUser()` during anonymous public rendering.
- Make A/B variant view increments atomic or queued instead of read-then-update in the page request.
- Keep webhook queueing out of the profile HTML response path.

### Phase 4: Optimize Media and Fonts

- Introduce a public-profile image wrapper using Next image optimization or Supabase/Bunny transform URLs.
- Mark only the real LCP image as priority: top cover if present, otherwise avatar.
- Add stable dimensions or aspect ratios for all public media.
- Prefer stored `.woff2` custom fonts with `font-display: swap`; avoid Google Fonts `@import` in profile CSS.

### Phase 5: Enforce Budgets

- Update Lighthouse CI to run mobile and desktop.
- Make `/u/demo` performance an error gate once baseline regressions are fixed.
- Add a heavy seeded profile to catch gallery, store, embed, booking, and image regressions.
- Add bundle budget checking for `/u/[username]`.

## Started

- Non-animated public profile sections now render as server markup without the client motion wrapper. Animated sections still use the existing motion island.
- Public tap tracking now runs after paint through `PublicProfileTracker` and `/api/analytics/track`.
- Public profile lookups now use `findCachedPublicProfileByUsername` with profile-specific cache tags and 60-second revalidation.
- Active A/B variant lookup is cached under the same public profile tag and only reads request headers when a live weighted variant exists.
- Public profile cache invalidation now pairs `revalidatePath` with `revalidateTag` through `revalidatePublicProfile`.
- Profile media now uses `ProfileImage`, optimizing trusted Supabase/Bunny/app/OAuth hosts while preserving a fallback for arbitrary external media.
- Lighthouse CI is mobile-first and includes `/u/demo` resource budgets for script, image, total, and third-party count.

## Next Implementation Slice

1. Run a production build and Lighthouse CI once the unrelated editor syntax error is cleared.
2. Record current `/u/demo` and heavy-profile Lighthouse numbers in this document.
3. Split password-protected and A/B variant rendering further if full anonymous HTML caching is still needed after data-cache gains.