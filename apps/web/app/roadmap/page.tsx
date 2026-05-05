import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustStrip } from "@/components/trust-strip";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Roadmap",
  description:
    "What we're building now, what's next, and what's later. Public, dated, and honest.",
  path: "/roadmap",
});

type Item = { title: string; body: string; eta?: string };

const NOW: Item[] = [
  { title: "Onyx Gold profile renderer", body: "Pixel-faithful to the mockups on 390×844. All 17 section types live." },
  { title: "Stripe-backed shop", body: "PVC, Metal, Custom-Art, Keychain, Stickers, Bundle, Team 5-pack, Verified." },
  { title: "DSR portal", body: "One-click data export + 30-day account deletion at /account/privacy." },
  { title: "Public docs", body: "API, webhooks, and SDK docs at /docs." },
];

const NEXT: Item[] = [
  { title: "Public status page", body: "Live uptime + incident history at status.ed5enterprise.com." },
  { title: "Case studies", body: "Five filmed customer stories across detailers, brokers, and creators." },
  { title: "Calendly + HubSpot section types", body: "First-party integrations as drop-in section blocks." },
  { title: "Apex custom domain wizard", body: "Apex + subdomain DNS validation in under 60 seconds." },
];

const LATER: Item[] = [
  { title: "Native iOS/Android pairing", body: "Web NFC fallback retired in favor of one-tap native pairing." },
  { title: "Team brand kit v2", body: "Shared assets, typography lockup, and per-seat overrides." },
  { title: "Marketplace section types", body: "Third-party-built blocks, reviewed and signed." },
];

function Column({ title, items, accent }: { title: string; items: Item[]; accent: string }) {
  return (
    <div className="surface flex flex-col p-6">
      <p className={`text-xs uppercase tracking-[0.2em] ${accent}`}>{title}</p>
      <ul className="mt-5 space-y-5">
        {items.map((i) => (
          <li key={i.title}>
            <p className="font-display text-lg text-ink">{i.title}</p>
            <p className="mt-1 text-sm text-ink-500">{i.body}</p>
            {i.eta && <p className="mt-1 text-xs text-ink-400">ETA: {i.eta}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-6 pb-12 pt-20 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-700">Roadmap</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight md:text-6xl">
          Public, dated, <span className="text-ink">honest</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-500">
          We ship in public. If something slips, we update this page and say why on the{" "}
          <Link href="/changelog" className="text-ink-700 hover:underline">changelog</Link>.
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-16 md:grid-cols-3">
        <Column title="Now" items={NOW} accent="text-ink-700" />
        <Column title="Next" items={NEXT} accent="text-ink" />
        <Column title="Later" items={LATER} accent="text-ink-400" />
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 text-center">
        <p className="text-sm text-ink-500">
          Want something on this list? Tell us at{" "}
          <Link href="/contact" className="text-ink-700 hover:underline">/contact</Link>.
        </p>
      </section>

      <TrustStrip />
      <SiteFooter />
    </main>
  );
}
