# VoidCard — Market Positioning & Trust Plan (v1)

> Companion to `BUILD_PLAN.md`. This doc decides **who we are to the customer**, **why they should pay $19 for a piece of metal when a Linktree is free**, and **how every surface in the product reinforces that promise**.

---

## 1. Competitive Landscape (May 2026 snapshot)

We sit at the intersection of three product categories. None of the incumbents own all three.

### 1.1 NFC business-card players
| Brand | Card price | Profile quality | Free tier | Weakness we exploit |
|---|---|---|---|---|
| **dotcards.net** | $25–$45 | Basic, templated | Limited (paywalled custom domain, branding, multi-profile) | Profile feels like a form. No design soul. |
| **Popl** | $24.99–$59.99 | Decent | Watered-down free, aggressive upsell | App-required pairing. Pushes Teams ($/seat) hard. |
| **Mobilo** | $79–$199 | Corporate | None — sub required | Enterprise-only. Out of reach for solo/SMB. |
| **Blinq** | Free card sometimes / $29 metal | Clean, minimal | Generous free | Looks like every other Blinq. No *personality*. |
| **V1CE** | $40–$110 | OK | Limited | Hardware-first, software is afterthought. Slow UI. |
| **HiHello** | $0 (digital) / $40 metal | Good | Generous | Identity-first ("digital business card"), not creator/lifestyle. |
| **Linq** | $14.95–$129 | Decent | Limited | Subscription required to remove watermark. |

### 1.2 Link-in-bio players
| Brand | Strengths | Why they don't threaten us |
|---|---|---|
| **Linktree** | Brand recognition, scale | No NFC, no real shop, generic look, $5–$24/mo for basics that we give free. |
| **Beacons** | Creator-economy features | No physical product. SaaS-only churn. |
| **Bento** | Aesthetic, modular | No NFC, no commerce, no SSO ecosystem. |
| **Carrd** | Cheap, simple | No DB, no analytics depth, no auth. |
| **Stan Store** | Creator commerce | Course/product focused, not identity. |

### 1.3 Creator commerce (peripheral)
Shopify, Gumroad, Stan, Whop. We don't replace them — we **link to** them. But we *do* take the impulse buy: "buy this $9 sticker / $35 bundle the moment they tap your card."

---

## 2. The Gap We Own

> **No one else sells a beautiful free profile + a beautiful physical card + a real shop, all under one identity.**

Said differently:
- Linktree = software, ugly default, not premium.
- dotcards/Popl = hardware, software is bolted on.
- Shopify = commerce, no identity layer.
- **VoidCard = identity layer (Onyx Gold default = instantly premium) + hardware drop-ship + commerce, all gratis at the floor.**

The structural moat:
1. **Card-led, not subscription-led.** One-time hardware revenue funds a free SaaS. Competitors must paywall to survive; we don't.
2. **Onyx Gold default** is a brand statement, not a template. Users opt *into* customization, not *out of* a generic look.
3. **ED5 ecosystem SSO.** A single account spans VoidCard, the rest of the ED5 portfolio. Switching cost compounds.
4. **Verified badge as a $5 trust good** — a cheap, high-margin signal that also acts as KYC for custom-domain / custom-art SKUs.

---

## 3. Positioning Statement (one sentence)

> **For people who treat their personal brand seriously, VoidCard is the metal-NFC card and living profile that look like luxury out of the box and stay free forever — because we sell the card, not the software.**

### 3.1 Tagline ladder (use the right one for the surface)
| Surface | Line |
|---|---|
| Hero (above fold) | **One tap. Every link, every time.** *(already in `app/page.tsx` — keep)* |
| Sub-hero | Hand someone metal, not a URL. |
| Pricing | Free forever. We sell the card, not the software. |
| Shop | The card *is* the upgrade. |
| Verified upsell | A $5 checkmark that says "really me." |
| About / Trust | Built in public on the ED5 Enterprise stack. |

### 3.2 Words we use
**Onyx, gold, hairline, weight, tap, living, real, metal, hand it over, claim, verified.**

### 3.3 Words we never use
~~Synergy, ecosystem [externally], unleash, revolutionary, game-changer, AI-powered [unless literally true], "creators" (we say "people"), "hustle," "solopreneur."~~

---

## 4. Target Segments (in priority order)

| # | Persona | Pain | Hook |
|---|---|---|---|
| 1 | **Detailers, barbers, tattoo artists, photographers, DJs** — single-operator service brands with strong visual identity | Linktree looks cheap; Popl looks like everyone else; need to capture leads at events | "Your card looks as good as your work." Premium card + Hero Media (before/after) + 2-way exchange (Pro). |
| 2 | **Real-estate agents, brokers, consultants, financial advisors** | Need wallet pass, custom domain, lead-form on every tap, professional polish | "Compliant lead capture in 3 taps." Wallet pass + lead forms + CSV export (Pro). |
| 3 | **Small-team agencies & studios (2–10 people)** | Brand consistency across cards, shared analytics | Team plan ($14.99/mo) + brand kit + 5-pack hardware bundle. |
| 4 | **Creators / influencers** | Linktree fatigue, want commerce in-flow | Shop + impulse SKUs ($9 stickers, $15 keychain) + embed widget. |
| 5 | **Conference / event attendees** | One-shot networking, doesn't need ongoing software | $19 card, 30-second signup, free profile, never charged again. |

We deprioritize: enterprise (Mobilo's playground), pure SaaS link-in-bio (Linktree's moat is brand), course creators (Stan/Whop own it).

---

## 5. The Free-Forever Promise (the central conversion lever)

This is the line we cannot cross. It is the **single biggest reason a new user picks us over dotcards or Popl**. Every product decision must defend it.

### 5.1 What "Free forever" actually means (publish this verbatim)
- All 12 themes, full custom CSS, all 17 section types.
- Wallet pass, embed widget, full analytics, 1-way contact capture.
- 5 GB media. 1 profile. 1 paired card.
- Footer reads `Powered by VoidCard` (small, gold hairline). **No watermark, no banner ad, no tap cap, no view cap, no link cap.**

### 5.2 What Free will *never* gain (hard floor for Pro)
Moving any of these into Free breaks the unit economics:
- Custom domain (DNS support cost).
- Footer removal (brand attribution = our marketing channel).
- Public API + webhooks (abuse + support cost).
- 2-way exchange + lead forms (B2B value, $4.99 price-justifying).
- Multi-profile beyond 1, paired cards beyond 1.

### 5.3 Anti-pattern guardrails
- No "you've used 8/10 of your free X this month" nags.
- No paywall modals on Free features. Pro upsells appear only on Pro-only screens.
- No email drip that pretends a Free account is "incomplete."

---

## 6. Trust Architecture

Trust is *built up*, not declared. Every tier below is a concrete artifact, not a slogan.

### 6.1 Tier A — Trust at first paint (`/`, `/u/[username]`, `/pricing`, `/shop`)
- **Above-the-fold price clarity.** "Free forever. Cards from $19." No "starting at," no asterisks.
- **Live profile preview** in the hero (already present). Real, not a screenshot.
- **One real paid customer profile linked from the homepage** as a "see it live" example (use `voidluxury` from seed `0024_vcard_seed_voidluxury.sql` until we have an external case study).
- **No fake testimonials.** If we have zero, we show zero. Replace with a "Built in public" panel: link to a public roadmap + changelog.
- **Onyx Gold default** is itself trust signal #1: it tells the visitor we have taste before we ask them to spend.

### 6.2 Tier B — Trust during signup
- **Magic link + Google + Apple** only. No password fields = no leaks.
- **No card required** for Free *and* for the 14-day Pro trial.
- **Plain-English data notice** on the signup page: 3 bullets, no legalese:
  - "We store your email and what you put on your profile. That's it."
  - "We never sell your data. Ever."
  - "Delete your account from Settings → Danger. Your profile and data are gone in 30 seconds."
- **Verified badge** ($5) shown as optional, never blocking.

### 6.3 Tier C — Trust on the public profile (highest-leverage surface)
The `/u/[username]` page is where 90% of trust impressions happen — every NFC tap lands here.
- **Verified checkmark** appears next to the name when granted (consistent gold tick).
- **`Powered by VoidCard`** footer doubles as social proof (small, dignified, not pushy).
- **`/u/[username]` Lighthouse mobile ≥ 95** (already a build-plan rule). A slow profile = the card owner looks unprofessional.
- **HTTPS-only**, HSTS preload, no third-party trackers on `/u/*` (only first-party tap event to our own endpoint).
- **Save Contact** downloads a real `.vcf`, not a redirect — proves we're not harvesting.

### 6.4 Tier D — Trust at purchase (`/shop`, Stripe checkout)
- Stripe-hosted checkout (no custom card form = customer sees the brand they trust).
- Order confirmation email within 30 seconds (Resend, transactional).
- **Public refund policy**: 30-day no-questions-asked on cards. Print it on the PDP, not buried.
- **Real shipping ETA** computed from carrier API; never "ships in 1–3 weeks" hand-wave.
- **Card pairing is reversible.** A replacement card ($9) re-pairs in 30 seconds. Promise this on the PDP.

### 6.5 Tier E — Trust during ownership
- **Status page** at `status.ed5enterprise.com` (shared across ED5 apps). Subscribe via email.
- **Public changelog** at `/changelog` (already exists). Every release noted.
- **Sentry + uptime SLOs** published quarterly: 99.9% on `/u/*`, 99.5% on dashboard.
- **Data export** as a one-click ZIP from Settings → Account. CSV of contacts, JSON of profile, raw analytics.
- **Account deletion is real.** Hard-delete + 30-day Stripe data purge + email confirmation. Document the steps in `/privacy`.

### 6.6 Tier F — Institutional trust
- **`security.txt`** at `/.well-known/security.txt` with disclosure address.
- **Privacy policy + Terms** drafted in plain English, with a one-line summary at the top of each section.
- **GDPR + CCPA** language on signup. We honor DSARs in 7 days, not 30.
- **Open changelog of breaches** if any ever occur (commitment in privacy policy).
- **No dark patterns.** Cancel button is the same size as the upgrade button. Always.

---

## 7. Conveyance Plan — How Each Surface Reinforces the Story

Every page either advances the core narrative *(free forever, card-led, premium by default, trustable)* or it gets cut.

| Surface | Primary message | Proof element | Action |
|---|---|---|---|
| `/` (home) | One tap, every link, every time. | Live phone preview. | Start free / Try the editor. |
| `/pricing` | Free does everything. Pro adds business power. | Side-by-side table from BUILD_PLAN §1. | Start free (default-selected) / Try Pro. |
| `/shop` | The card is the upgrade. | Real product photos on Onyx Gold backdrop. | Buy card. |
| `/shop/[slug]` | This card pairs in 30 seconds and works for life. | Pairing GIF, refund policy, materials spec. | Add to cart. |
| `/u/[username]` | This is what your tap delivers. | Onyx Gold default + verified tick. | Save contact / explore. |
| `/changelog` | We ship. | Dated entries, signed-off. | Subscribe. |
| `/docs` | We're real engineers. | API docs, webhook spec, SDK. | Read. |
| `/privacy`, `/terms` | We don't hide. | Plain-English summaries. | (none — clarity is the action). |
| `/contact` | A human reads this. | Response SLA on the page. | Send. |
| Signup | 30 seconds. No card. No tricks. | 3-bullet data notice. | Sign up. |
| Dashboard empty state | Onboarding in 4 steps, skippable. | Progress dots, never modal. | Build profile. |
| Pro upsell modal | Triggered only on a Pro-only feature click. | One-line value, monthly price, cancel anytime. | Start trial / dismiss. |

### 7.1 Concrete copy edits to ship now
1. **Homepage sub-hero** (`app/page.tsx`): replace generic feature trio with **(a) "Free forever — really" (b) "Premium by default" (c) "Your card pairs in 30 seconds."** Each links to a proof page.
2. **Add a `/why-voidcard` page** (single scroll, ~400 words, comparison table from §1.1, links to `/pricing` and `/shop`).
3. **Add a Trust strip** above the footer on `/`, `/pricing`, `/shop`: "Stripe-secured checkout · 30-day refund · No data sold · Delete in one click." Each item links to its proof.
4. **Pricing page**: replace any $/mo as the *first* number. Lead with **"$0 forever"** in the same type size as **"$4.99/mo"**. Equal visual weight = honesty signal.
5. **Shop PDP**: every card page must show: pairing time, materials, refund window, "works without our app" line.
6. **Public profile footer** (`/u/[username]`): keep `Powered by VoidCard` *gold hairline*, link to `/`. Never a banner.
7. **Empty-state on dashboard**: replace "Upgrade to Pro" CTAs with **"Get your card"** as the primary path. Card = the wow, not the sub.
8. **Verified badge sales page** (`/verified` or in `/pricing`): one paragraph, "$5 once, optional, free with any card." Don't make it look like a tier.

---

## 8. Trust KPIs (track from launch)

| Metric | Target (90 days) | Why |
|---|---|---|
| `/u/[username]` Lighthouse mobile | ≥95 | Card owner perceived professionalism. |
| Signup → published profile, p50 | ≤ 4 min | Activation = trust validated. |
| Free → paid card conversion | ≥ 6% within 14 days of signup | The funnel works. |
| Free → Pro conversion | ≥ 2.5% within 30 days | Pro features genuinely valuable, not coerced. |
| Refund rate (cards) | < 3% | Product matches expectation. |
| NPS (in-app, after 7 days of use) | ≥ 45 | Real liking, not just utility. |
| Status page uptime `/u/*` | ≥ 99.9% rolling 30-day | The card always works. |
| Support response, p50 | < 6 business hours | Humans reachable. |
| Account deletion completion | < 30 seconds end-to-end | Reversibility = trust. |

---

## 9. Anti-claims (what we *will not* say even though competitors do)

- ❌ "AI-powered" — we don't ship AI features yet, and we won't fake it.
- ❌ "Used by Fortune 500" — until literally true, with a logo and a quote.
- ❌ "Free trial" of features that are actually free.
- ❌ "Limited time offer" on the perpetual price.
- ❌ "Join 100,000+ creators" — vanity counter, easy to disprove. Show real growth on the changelog instead.
- ❌ Comparison charts that strawman competitors. The §1.1 table is factual or it gets cut.

---

## 10. 30/60/90 Execution

### Days 0–30 (foundation, all in-product)
- [ ] Ship `/why-voidcard` page (this doc → user-facing).
- [ ] Trust strip above footer on `/`, `/pricing`, `/shop`.
- [ ] Plain-English summary block at top of `/privacy` and `/terms`.
- [ ] `/.well-known/security.txt`.
- [ ] One-click data export in Settings → Account.
- [ ] Audit every "Upgrade to Pro" CTA; remove any that fire on Free features.
- [ ] Refund-policy block on every shop PDP.
- [ ] Replace homepage feature trio with the three trust-anchored claims (§7.1).

### Days 31–60 (proof artifacts)
- [ ] Recruit 5 paying card customers across personas 1, 2, 4 (§4). Filmed 30-second testimonials, hosted on `/customers`. No actors.
- [ ] Public roadmap page at `/roadmap` (Now / Next / Later).
- [ ] Status page live at `status.ed5enterprise.com`.
- [ ] Quarterly transparency post on `/changelog` (uptime, security, financials at the level founders are comfortable with).
- [ ] Verified-badge KYC flow polished + documented.

### Days 61–90 (compounding)
- [ ] Case study #1 (long-form) — pick the best persona-1 detailer/barber.
- [ ] Press kit at `/press` (logo, screenshots, fact sheet).
- [ ] First external integration (e.g., Calendly section type, HubSpot lead-form sink) — proves we're a real platform, not a silo.
- [ ] Run NPS at day-7 in-app; publish quarterly aggregate on `/changelog`.

---

## 11. The One Sentence To Remember

> **We sell the card. The software is free because we want every tap to feel like a $19 handshake — and the only way to guarantee that is to never charge for the handshake itself.**

If a feature, page, email, or pricing decision contradicts that sentence, it gets reworked or cut.
