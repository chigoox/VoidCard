import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustStrip } from "@/components/trust-strip";
import { buildMetadata } from "@/lib/seo";
import { jsonLdScript, faqPage } from "@/lib/jsonld";

export const metadata = buildMetadata({
  title: "VoidCard — Metal NFC business cards + free link-in-bio",
  description:
    "One tap shares every link, every time. Metal NFC card + a living profile that always reflects who you are right now. Free forever, premium by default.",
  path: "/",
});

const HOME_FAQ = [
  { q: "What is VoidCard?", a: "VoidCard is a metal NFC business card paired with a free link-in-bio profile. Tap the card to share every link you want, instantly, and update them any time without reprinting." },
  { q: "How much does it cost?", a: "The profile is free forever with all themes, custom CSS, every section type, wallet pass, embed widget, and full analytics. Cards start at $19 (PVC) and $29 (metal)." },
  { q: "How is VoidCard different from Linktree or Popl?", a: "VoidCard is free for all the features competitors gate behind subscriptions. We make money on the physical card, not the software." },
  { q: "Do I need an app?", a: "No. The card uses standard NFC and works with any modern phone — no app install required for either party." },
];

const FEATURE_GROUPS = [
  {
    eyebrow: "Profile builder",
    title: "A public page that feels owned, not rented.",
    points: [
      "17 section types: links, gallery, video, embeds, forms, QR, map, schedule, tip jar",
      "All themes and custom CSS available on Free",
      "Draft and publish flow with live editing",
      "Public profile routes with SEO metadata and downloadable vCard",
    ],
    href: "/try",
    cta: "Try the editor",
  },
  {
    eyebrow: "Cards and pairing",
    title: "Physical cards that make the software memorable.",
    points: [
      "PVC, metal, custom-art, bundle, keychain, sticker, replacement, and team-pack SKUs",
      "One-tap NFC redirect flow to the live profile",
      "Manual and first-time pair flow for unpaired cards",
      "Verified badge included with qualifying card purchases",
    ],
    href: "/shop",
    cta: "Browse the shop",
  },
  {
    eyebrow: "Growth and analytics",
    title: "Know what happened after the hand-off.",
    points: [
      "Track taps, views, and link clicks",
      "Short links under the shared short domain",
      "Lead capture and contact collection",
      "Public API and webhooks for deeper workflows on paid plans",
    ],
    href: "/pricing",
    cta: "See plan details",
  },
  {
    eyebrow: "Business mode",
    title: "Upgrade only when the business tooling matters.",
    points: [
      "Custom domains and brand removal on Pro",
      "Multi-profile setups, scheduled publishing, and A/B variants",
      "Team seats, brand kit, and roles on Team",
      "Admin console for products, plans, orders, users, and settings",
    ],
    href: "/customers",
    cta: "See who it fits",
  },
] as const;

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(faqPage(HOME_FAQ))}
      />
      <SiteHeader />

      {/* Hero */}
      <section className="mx-auto grid max-w-7xl gap-16 px-6 pb-24 pt-20 md:grid-cols-2 md:items-center">
        <div className="animate-fade-in">
          <p className="eyebrow">NFC business cards · Free profile</p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink md:text-6xl">
            One tap. Every link, every time.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-ink-500">
            VoidCard pairs a real metal NFC card with a living profile that always reflects who you are right now.
            Free to use forever. Premium cards unlock the wow.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/shop" className="btn-primary">Get your card</Link>
            <Link href="/signup" className="btn-outline">Start free</Link>
            <Link href="/try" className="btn-outline">Try the editor</Link>
          </div>
          <p className="mt-3 text-sm text-ink-400">
            Free includes themes, custom CSS, all 17 sections, wallet pass, embed, and full analytics.
          </p>
        </div>

        {/* Phone preview — Onyx Gold product look */}
        <div className="flex w-full justify-center">
          <div className="phone-frame">
            {/* status bar notch */}
            <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-center pt-3">
              <div className="h-[26px] w-[110px] rounded-full bg-black" />
            </div>
            <div className="flex h-full flex-col overflow-y-auto bg-onyx-950 text-ivory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {/* cover image strip */}
              <div className="h-32 w-full shrink-0 bg-gradient-to-br from-onyx-900 to-onyx-800" />
              {/* avatar — overlaps cover */}
              <div className="-mt-10 flex flex-col items-center px-5">
                <div className="size-20 shrink-0 rounded-full border-4 border-onyx-950 bg-gold-grad" />
                <div className="mt-2 flex items-center gap-1.5">
                  <h2 className="font-display text-lg font-semibold leading-tight">Void Luxury Detailing</h2>
                  <span className="text-gold text-xs">✓</span>
                </div>
                <p className="mt-0.5 text-xs text-ivory-dim">@voidluxury · Auto detailing studio</p>
              </div>
              {/* links section */}
              <div className="mt-4 space-y-2 px-4">
                {[
                  { label: "Book a service", icon: "📅" },
                  { label: "Instagram", icon: "📷" },
                  { label: "TikTok", icon: "▶" },
                  { label: "Save my contact", icon: "👤" },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between rounded-[14px] border border-onyx-700 bg-onyx-900 px-4 py-3 text-sm">
                    <div className="flex items-center gap-2.5">
                      <span className="text-base">{item.icon}</span>
                      <span className="text-ivory">{item.label}</span>
                    </div>
                    <span className="text-gold text-xs">→</span>
                  </div>
                ))}
              </div>
              {/* gallery strip */}
              <div className="mt-4 px-4">
                <p className="mb-2 text-[10px] uppercase tracking-widest text-ivory-mute">Gallery</p>
                <div className="grid grid-cols-3 gap-1 overflow-hidden rounded-[14px]">
                  {["from-amber-900/60 to-onyx-900", "from-onyx-800 to-onyx-900", "from-gold/20 to-onyx-900"].map((g, i) => (
                    <div key={i} className={`aspect-square w-full bg-gradient-to-br ${g}`} />
                  ))}
                </div>
              </div>
              {/* powered-by */}
              <div className="mt-auto pb-3 pt-5 text-center text-[9px] uppercase tracking-widest text-ivory-mute/50">
                Powered by VoidCard
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Three trust-anchored claims */}
      <section className="border-y border-paper-200 bg-paper-50">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 md:grid-cols-3">
          {[
            {
              title: "Free forever — really",
              body: "Themes, custom CSS, every section, wallet pass, embed, full analytics. No tap caps, no view caps, no link caps.",
              href: "/pricing",
              cta: "See what's free",
            },
            {
              title: "Premium by default",
              body: "Onyx Gold is the out-of-box profile look. Taste shipped, not assembled — and customizable down to the last pixel.",
              href: "/u/voidluxury",
              cta: "See a live profile",
            },
            {
              title: "Your card pairs in 30 seconds",
              body: "Tap to phone, sign in, done. Replacement cards re-pair just as fast. Cards never expire.",
              href: "/shop",
              cta: "Browse cards",
            },
          ].map((c) => (
            <div key={c.title} className="flex flex-col">
              <h3 className="font-display text-2xl font-semibold text-ink">{c.title}</h3>
              <p className="mt-2 flex-1 text-ink-500">{c.body}</p>
              <Link href={c.href} className="mt-4 text-sm font-medium text-ink underline-offset-4 hover:underline">
                {c.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.2em] text-ink-700">Feature set</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">
            Everything that makes the card feel alive after the tap.
          </h2>
          <p className="mt-4 text-lg text-ink-500">
            VoidCard is not just a link page. It is a profile builder, NFC product, lead engine,
            analytics surface, and lightweight business system.
          </p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {FEATURE_GROUPS.map((group) => (
            <div key={group.title} className="surface flex flex-col p-6">
              <p className="text-xs uppercase tracking-[0.2em] text-ink-700">{group.eyebrow}</p>
              <h3 className="mt-3 font-display text-2xl text-ink">{group.title}</h3>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ink-500">
                {group.points.map((point) => (
                  <li key={point} className="flex gap-2">
                    <span className="text-ink-700">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
              <Link href={group.href} className="mt-6 text-sm font-medium text-ink underline-offset-4 hover:underline">
                {group.cta} →
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* CTA strip — card-led */}
      <section className="mx-auto max-w-7xl px-6 py-24 text-center">
        <h2 className="font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">
          Your handle is probably still free.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-ink-500">
          Claim it in 30 seconds. Add the card whenever you&rsquo;re ready for the wow.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn-primary">Get your card</Link>
          <Link href="/signup" className="btn-outline">Start free</Link>
          <Link href="/why-voidcard" className="btn-outline">Why VoidCard</Link>
        </div>
      </section>

      <TrustStrip />
      <SiteFooter />
    </main>
  );
}