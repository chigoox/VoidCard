import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CalendarCheck,
  Check,
  Contact,
  Globe,
  Images,
  MessageSquareQuote,
  Nfc,
  PlayCircle,
  ReceiptText,
  ShoppingBag,
  Sparkles,
  UserPlus,
  Wallet,
} from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustStrip } from "@/components/trust-strip";
import { PhoneProfileMock } from "@/components/home/PhoneProfileMock";
import { AmbientVideo } from "@/components/sections/AmbientVideo";
import { showcaseCover } from "@/components/showcase/ShowcaseProfile";
import { SHOWCASE_TEMPLATES } from "@/lib/editor/showcaseTemplates";
import { buildMetadata } from "@/lib/seo";
import { jsonLdScript, faqPage } from "@/lib/jsonld";

export const metadata = buildMetadata({
  title: "VoidCard — NFC business cards + a free page that books, sells and saves your contact",
  description:
    "For stylists, barbers, nail techs, boutiques, artists and local pros. One tap of your card opens a free page where clients book, buy, tip and save your contact. 0% platform fee on sales.",
  path: "/",
});

const HOME_FAQ = [
  {
    q: "What is VoidCard?",
    a: "An NFC business card plus a free page of your own. Tap the card on any modern phone and your page opens: clients can book, shop, tip, follow you and save your contact. Change the page any time — the card never needs reprinting.",
  },
  {
    q: "What's free?",
    a: "The page itself, forever: every theme and section (booking, shop, tips, gallery, video banners, reviews), analytics, wallet pass and contact saving. Pro ($4.99/mo) adds a custom domain, lead-capture forms, more profiles and unlimited cards. Cards start at $19.",
  },
  {
    q: "Do you take a cut of my sales?",
    a: "No. VoidCard's platform fee is 0%. Payments run through your own Stripe account, so Stripe's standard processing fees apply, and you can optionally share a percentage with us.",
  },
  {
    q: "How does booking work?",
    a: "Add a booking section and connect your Boox account. Clients pick a service and a time right from your page instead of messaging you.",
  },
  {
    q: "Do my clients need an app?",
    a: "No. The card uses standard NFC that iPhones and Android phones read natively, and your page also works as a normal link for your Instagram or TikTok bio.",
  },
  {
    q: "What if I already use Linktree or a booking app?",
    a: "Keep your booking app if you love it — link to it from your page. Most people find one VoidCard page replaces their link-in-bio, their store link and their paper cards.",
  },
];

const TRADES: Array<{ label: string; template?: string; href?: string; blurb: string }> = [
  { label: "Hair & barbers", template: "gloss-hair", blurb: "Service menu, portfolio and one-tap booking." },
  { label: "Nails & lashes", template: "lacquer-lounge", blurb: "Set gallery, prices and Book your set." },
  { label: "Boutiques", template: "row-atelier", blurb: "Lookbook, new drops and Shop now." },
  { label: "Artists & DJs", template: "nova-nights", blurb: "New release, tour dates and tickets." },
  { label: "Creative studios", template: "aurora-studio", blurb: "Portfolio, services and enquiries." },
  { label: "Coaches & wellness", template: "verdant", blurb: "Programs, reviews and discovery calls." },
];

const OUTCOMES = [
  {
    icon: CalendarCheck,
    title: "Stop booking in your DMs",
    body: "Clients pick a service and a time straight from your page. No back-and-forth, no “what times do you have?”.",
    detail: "Booking section with Boox",
  },
  {
    icon: ShoppingBag,
    title: "Sell without a monthly store fee",
    body: "Products, merch, gift cards and tips — paid through your own Stripe account. VoidCard takes 0%.",
    detail: "Shop and tip sections",
  },
  {
    icon: Contact,
    title: "Never get lost in someone's camera roll",
    body: "One tap saves your name, number and page into their contacts — no app, no typing, no paper card to lose.",
    detail: "Save contact + wallet pass",
  },
] as const;

const STEPS = [
  { n: "1", title: "Claim your page", body: "Pick a design built for your trade, or start blank. Free, no card required." },
  { n: "2", title: "Add what clients need", body: "Booking, prices, your work, your shop, your socials. Drag to arrange it for phone and desktop." },
  { n: "3", title: "Tap, share, get booked", body: "Pair your card in 30 seconds, put the link in your bio, and watch taps turn into appointments." },
] as const;

const EVERYTHING = [
  { icon: PlayCircle, title: "Video banners", body: "A looping clip of your work at the top of your page." },
  { icon: Images, title: "Portfolio gallery", body: "Before-and-afters, lookbooks and sets, with a tap-to-zoom lightbox." },
  { icon: ReceiptText, title: "Price menu", body: "Services and prices clients can read before they book." },
  { icon: MessageSquareQuote, title: "Reviews", body: "Show off what clients say, with star ratings." },
  { icon: BarChart3, title: "Analytics", body: "See taps, views and which buttons get clicked." },
  { icon: Wallet, title: "Wallet pass", body: "Your card in Apple and Google Wallet, too." },
  { icon: UserPlus, title: "Lead forms", body: "Collect names and emails at events.", pro: true },
  { icon: Globe, title: "Your own domain", body: "yourname.com instead of a shared link.", pro: true },
] as const;

const PLANS = [
  { name: "Free", price: "$0", note: "forever", points: ["Your page with every section", "Booking, shop and tips", "0% platform fee", "1 card"] },
  { name: "Pro", price: "$4.99", note: "per month", points: ["Everything in Free", "Custom domain, no branding", "Lead-capture forms", "Unlimited cards, 10 profiles"] },
  { name: "Team", price: "$14.99", note: "per month", points: ["Everything in Pro", "10 seats for your crew", "Shared brand kit", "Roles and permissions"] },
] as const;

export default function HomePage() {
  const trades = TRADES.map((trade) => {
    const template = SHOWCASE_TEMPLATES.find((t) => t.id === trade.template);
    return { ...trade, href: template ? `/examples/${template.id}` : trade.href ?? "/examples", cover: template ? showcaseCover(template) : null };
  });

  return (
    <main className="min-h-screen bg-white text-ink">
      <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdScript(faqPage(HOME_FAQ))} />
      <SiteHeader />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[38rem] bg-[radial-gradient(60%_60%_at_75%_30%,rgba(212,175,55,0.16),transparent_70%)]" aria-hidden />
        <div className="relative mx-auto grid max-w-7xl gap-14 px-6 pb-20 pt-16 md:grid-cols-[1.1fr_0.9fr] md:items-center md:pt-24">
          <div className="animate-fade-in">
            <p className="eyebrow">For stylists, barbers, nail techs, boutiques, artists &amp; local pros</p>
            <h1 className="mt-4 font-display text-5xl font-semibold leading-[1.02] tracking-tight text-ink md:text-7xl">
              Get booked, get paid, get saved — with one tap.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-ink-500">
              A tap-to-share card plus a free page of your own. Clients book an appointment, buy from your shop, leave a tip and save your contact — no app, no DMs, no paper cards.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-3">
              <Link href="/signup" className="btn-primary px-6 py-3 text-base" data-testid="home-start-free">
                Start free
              </Link>
              <Link href="/examples" className="inline-flex items-center gap-1.5 text-sm font-medium text-ink underline-offset-4 hover:underline">
                See pages built for your trade <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
            <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm text-ink-500">
              {["Free forever", "0% platform fee on sales", "Cards from $19", "Works on iPhone & Android"].map((item) => (
                <li key={item} className="flex items-center gap-1.5">
                  <Check className="size-4 text-ink" aria-hidden /> {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex justify-center md:justify-end">
            <div className="absolute -left-4 top-10 hidden w-56 overflow-hidden rounded-[28px] border border-black/10 shadow-[0_30px_70px_-40px_rgba(10,10,10,0.7)] lg:block">
              <div className="relative aspect-[4/5]">
                <Image src="/marketing/handoff-hero.png" alt="A client taps a VoidCard to open the matching page on her phone." fill sizes="224px" className="object-cover" priority />
              </div>
              <p className="flex items-center gap-1.5 bg-white px-4 py-3 text-xs font-medium text-ink">
                <Nfc className="size-4" aria-hidden /> Tap the card, the page opens
              </p>
            </div>
            <div className="relative md:mr-6">
              <PhoneProfileMock />
              <div className="absolute -bottom-5 -right-2 rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm shadow-[0_20px_50px_-30px_rgba(10,10,10,0.5)] md:-right-8">
                <p className="text-xs text-ink-400">New booking</p>
                <p className="font-medium text-ink">Silk press · Sat 10:30</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pick your trade */}
      <section className="border-y border-paper-200 bg-paper-50 py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div className="max-w-2xl">
              <p className="eyebrow">Built for your trade</p>
              <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Start from a page that already fits.</h2>
              <p className="mt-4 text-lg text-ink-500">Every design is a real VoidCard page. Open one, then make it yours in a click.</p>
            </div>
            <Link href="/examples" className="btn-outline">All examples</Link>
          </div>
          <div className="-mx-6 mt-10 flex snap-x snap-mandatory gap-4 overflow-x-auto px-6 pb-4 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 lg:grid-cols-6" data-testid="home-trades">
            {trades.map((trade) => (
              <Link
                key={trade.label}
                href={trade.href}
                className="group relative w-[62vw] max-w-[260px] shrink-0 snap-start overflow-hidden rounded-[24px] bg-onyx-950 text-white md:w-auto md:max-w-none"
              >
                <div className="relative aspect-[3/4]">
                  {trade.cover?.image ? (
                    <Image src={trade.cover.image} alt="" fill sizes="(min-width: 1024px) 16vw, (min-width: 768px) 33vw, 62vw" className="object-cover transition duration-700 group-hover:scale-105" />
                  ) : null}
                  {trade.cover?.video ? <AmbientVideo src={trade.cover.video} poster={trade.cover.image} className="absolute inset-0 size-full object-cover" /> : null}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <p className="font-display text-xl leading-tight">{trade.label}</p>
                    <p className="mt-1 text-xs leading-5 text-white/70">{trade.blurb}</p>
                    <p className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-white">
                      See the page <ArrowRight className="size-3.5 transition group-hover:translate-x-0.5" aria-hidden />
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Outcomes */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="max-w-2xl">
          <p className="eyebrow">What it does for you</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Less admin. More appointments.</h2>
        </div>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {OUTCOMES.map(({ icon: Icon, title, body, detail }) => (
            <div key={title} className="surface flex flex-col p-7">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-ink text-white">
                <Icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-2xl font-semibold text-ink">{title}</h3>
              <p className="mt-3 flex-1 leading-7 text-ink-500">{body}</p>
              <p className="mt-5 text-xs font-medium uppercase tracking-[0.18em] text-ink-400">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-ink py-24 text-white">
        <div className="mx-auto max-w-7xl px-6">
          <p className="text-sm uppercase tracking-[0.2em] text-white/50">How it works</p>
          <h2 className="mt-3 max-w-2xl font-display text-4xl font-semibold tracking-tight md:text-5xl">Set up before your next client sits down.</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {STEPS.map((step) => (
              <li key={step.n}>
                <span className="font-display text-5xl text-[#d4af37]">{step.n}</span>
                <h3 className="mt-3 font-display text-2xl">{step.title}</h3>
                <p className="mt-2 leading-7 text-white/70">{step.body}</p>
              </li>
            ))}
          </ol>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link href="/signup" className="inline-flex min-h-11 items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-paper-100">
              Start free
            </Link>
            <Link href="/try" className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:border-white/50">
              Try the editor first
            </Link>
          </div>
        </div>
      </section>

      {/* The card */}
      <section className="mx-auto max-w-7xl px-6 py-24">
        <div className="relative overflow-hidden rounded-[32px] bg-black text-white">
          <div className="relative min-h-[32rem] md:aspect-[16/7] md:min-h-0">
            <Image src="/marketing/luxury-banner.png" alt="Two clients hold matte black VoidCards with a gold mark." fill sizes="(max-width: 768px) 100vw, 1280px" className="object-cover object-[70%_center]" />
            <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.55)_45%,rgba(0,0,0,0.1)_100%)]" />
          </div>
          <div className="absolute inset-0 flex items-end md:items-center">
            <div className="max-w-xl p-6 md:p-12">
              <p className="text-xs uppercase tracking-[0.22em] text-white/60">The card</p>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-5xl">The last business card you&rsquo;ll ever print.</h2>
              <p className="mt-4 leading-7 text-white/75">
                Hand someone something they keep. Change your prices, hours or links any time — the card always opens your latest page.
              </p>
              <ul className="mt-6 grid grid-cols-3 gap-3 text-sm">
                {[["PVC", "$19"], ["Metal", "$29"], ["Keychain", "$15"]].map(([name, price]) => (
                  <li key={name} className="rounded-2xl border border-white/15 bg-white/5 px-3 py-3 backdrop-blur">
                    <p className="text-white/60">{name}</p>
                    <p className="font-display text-2xl">{price}</p>
                  </li>
                ))}
              </ul>
              <Link href="/shop" className="mt-6 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white px-5 py-3 text-sm font-semibold text-ink transition hover:bg-paper-100">
                Shop cards <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Everything on one page */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="max-w-2xl">
          <p className="eyebrow">One page instead of five apps</p>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Everything clients look for, in one place.</h2>
          <p className="mt-4 text-lg text-ink-500">Your link in bio, booking link, store, portfolio and business card — together, and looking like you.</p>
        </div>
        <div className="mt-12 grid gap-px overflow-hidden rounded-[28px] border border-paper-200 bg-paper-200 sm:grid-cols-2 lg:grid-cols-4">
          {EVERYTHING.map(({ icon: Icon, title, body, ...rest }) => (
            <div key={title} className="bg-white p-6">
              <div className="flex items-center gap-2">
                <Icon className="size-5 text-ink" aria-hidden />
                <h3 className="font-medium text-ink">{title}</h3>
                {"pro" in rest && rest.pro ? <span className="rounded-full bg-paper-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-500">Pro</span> : null}
              </div>
              <p className="mt-2 text-sm leading-6 text-ink-500">{body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 flex items-center gap-2 text-sm text-ink-500">
          <Sparkles className="size-4 text-ink" aria-hidden />
          Make it unmistakably yours: themes, fonts, colours, animations and separate layouts for phone, tablet and desktop.
        </p>
      </section>

      {/* Pricing */}
      <section className="border-t border-paper-200 bg-paper-50 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="max-w-2xl">
            <p className="eyebrow">Pricing</p>
            <h2 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">Free does the job. Upgrade if you grow.</h2>
            <p className="mt-4 text-lg text-ink-500">We make money on cards, not by charging you to get paid.</p>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {PLANS.map((plan, i) => (
              <div key={plan.name} className={["flex flex-col rounded-[28px] border p-7", i === 0 ? "border-ink bg-white shadow-[0_30px_60px_-40px_rgba(10,10,10,0.5)]" : "border-paper-200 bg-white"].join(" ")}>
                <p className="font-medium text-ink">{plan.name}</p>
                <p className="mt-3">
                  <span className="font-display text-5xl text-ink">{plan.price}</span>{" "}
                  <span className="text-sm text-ink-400">{plan.note}</span>
                </p>
                <ul className="mt-6 flex-1 space-y-2.5 text-sm text-ink-500">
                  {plan.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <Check className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden /> {point}
                    </li>
                  ))}
                </ul>
                {i === 0 ? (
                  <Link href="/signup" className="btn-primary mt-7 justify-center">Start free</Link>
                ) : (
                  <Link href="/pricing" className="btn-outline mt-7 justify-center">Compare plans</Link>
                )}
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-ink-400">Payments run through your own Stripe account; Stripe&rsquo;s standard processing fees apply. Booking requires a Boox account.</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-3xl px-6 py-24">
        <h2 className="text-center font-display text-4xl font-semibold tracking-tight">Questions, answered</h2>
        <div className="mt-10 divide-y divide-paper-200 border-y border-paper-200">
          {HOME_FAQ.map((item) => (
            <details key={item.q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-left font-medium text-ink [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="text-xl leading-none text-ink-400 transition group-open:rotate-45" aria-hidden>+</span>
              </summary>
              <p className="mt-3 leading-7 text-ink-500">{item.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="rounded-[32px] bg-ink px-6 py-16 text-center text-white md:py-20">
          <h2 className="mx-auto max-w-2xl font-display text-4xl font-semibold tracking-tight md:text-5xl">Your name is probably still free.</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/70">Claim your page in a minute. Add the card whenever you&rsquo;re ready.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/signup" className="inline-flex min-h-11 items-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:bg-paper-100">
              Start free
            </Link>
            <Link href="/shop" className="inline-flex min-h-11 items-center rounded-full border border-white/25 px-6 py-3 text-sm font-medium text-white transition hover:border-white/50">
              Get a card
            </Link>
          </div>
        </div>
      </section>

      <TrustStrip />
      <SiteFooter />
    </main>
  );
}
