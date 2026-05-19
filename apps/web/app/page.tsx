import Image from "next/image";
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

const SHOWCASE_CASES = [
  {
    eyebrow: "Consultations and clinics",
    title: "Share credentials and next steps in one handoff.",
    body:
      "A polished card can open a profile with booking, directions, intake links, and contact details without asking someone to type or search.",
    href: "/customers",
    cta: "See customer types",
    src: "/marketing/premium-duo.png",
    alt: "Two women hold premium VoidCards in a luxury interior.",
  },
  {
    eyebrow: "Brands, founders, and teams",
    title: "Look premium before the first sentence lands.",
    body:
      "Luxury brands, stylists, and event teams can hand over something physical that still routes to a profile updated in real time.",
    href: "/contact",
    cta: "Ask about team orders",
    src: "/marketing/doctor-use-case.png",
    alt: "A doctor hands a VoidCard to a patient while the matching profile is open on a phone.",
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

        <div className="flex w-full justify-center md:justify-end">
          <div className="w-full max-w-[35rem]">
            <div className="relative aspect-[4/5] overflow-hidden rounded-[32px] border border-black/10 bg-black shadow-[0_30px_90px_-45px_rgba(10,10,10,0.65)]">
              <Image
                src="/marketing/handoff-hero.png"
                alt="A VoidCard metal card is handed over while the matching profile is open on a phone."
                fill
                priority
                className="object-cover"
                sizes="(max-width: 768px) 100vw, (max-width: 1280px) 44vw, 560px"
              />
              <div className="absolute inset-0 bg-gradient-to-tr from-black/70 via-black/20 to-transparent" />
              <div className="absolute left-5 top-5 rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-white/80 backdrop-blur">
                No app required
              </div>
              <div className="absolute inset-x-0 bottom-0 p-6 text-white md:p-8">
                <p className="text-xs uppercase tracking-[0.24em] text-white/65">Real-world handoff</p>
                <p className="mt-3 max-w-sm text-sm leading-6 text-white/80 md:text-base">
                  One tap opens the live profile immediately, so the conversation keeps moving instead of waiting for someone to search, scan, or type.
                </p>
              </div>
            </div>

            <div className="-mt-10 ml-auto mr-4 max-w-[16rem] rounded-[24px] border border-black/10 bg-white/95 p-4 shadow-[0_24px_60px_-35px_rgba(10,10,10,0.35)] backdrop-blur">
              <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-ink-500">What opens</p>
              <div className="mt-3 space-y-2 text-sm text-ink-500">
                {[
                  "Contact card and save-to-phone",
                  "Booking or lead capture",
                  "Social, website, and live updates",
                ].map((item) => (
                  <div key={item} className="flex items-start gap-2">
                    <span className="mt-1 size-1.5 shrink-0 rounded-full bg-ink" />
                    <span>{item}</span>
                  </div>
                ))}
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

      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="relative overflow-hidden rounded-[32px] border border-black/10 bg-black shadow-[0_30px_90px_-45px_rgba(10,10,10,0.5)]">
          <div className="relative min-h-[30rem] md:aspect-[16/7] md:min-h-0">
            <Image
              src="/marketing/luxury-banner.png"
              alt="Two women hold VoidCards in a dark luxury interior."
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 1280px"
            />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.46)_46%,rgba(0,0,0,0.12)_100%)]" />
          </div>

          <div className="absolute inset-0 flex items-end md:items-center">
            <div className="max-w-2xl p-6 text-white md:p-10">
              <p className="text-xs font-medium uppercase tracking-[0.22em] text-white/60">Luxury-first branding</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">
                Built to feel expensive before you upgrade anything.
              </h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-white/75 md:text-base">
                The card is the hook. The live profile makes the handoff last, so a strong first impression turns into a profile people can actually act on.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href="/shop"
                  className="inline-flex min-h-11 items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-ink shadow-soft transition hover:bg-paper-100"
                >
                  See card finishes
                </Link>
                <Link
                  href="/why-voidcard"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-5 py-3 text-sm font-medium text-white transition hover:border-white/40 hover:bg-white/10"
                >
                  Why it stays free
                </Link>
              </div>
            </div>
          </div>
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

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="grid gap-8 lg:grid-cols-[0.9fr,1.1fr] lg:items-start">
          <div className="max-w-xl">
            <p className="eyebrow">Use cases</p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl">
              Made for the rooms where polish and follow-through both matter.
            </h2>
            <p className="mt-4 text-lg text-ink-500">
              These are the moments VoidCard actually solves: a premium first impression backed by a live profile that can book, route, capture, or convert on the spot.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link href="/customers" className="btn-outline">Explore customer types</Link>
              <Link href="/contact" className="btn-outline">Talk about team orders</Link>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            {SHOWCASE_CASES.map((item) => (
              <article key={item.title} className="surface overflow-hidden">
                <div className="relative aspect-[4/5]">
                  <Image
                    src={item.src}
                    alt={item.alt}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 30vw"
                  />
                </div>
                <div className="p-5">
                  <p className="text-xs uppercase tracking-[0.2em] text-ink-700">{item.eyebrow}</p>
                  <h3 className="mt-3 font-display text-2xl text-ink">{item.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-ink-500">{item.body}</p>
                  <Link href={item.href} className="mt-5 inline-block text-sm font-medium text-ink underline-offset-4 hover:underline">
                    {item.cta} →
                  </Link>
                </div>
              </article>
            ))}
          </div>
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
