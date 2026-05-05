import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustStrip } from "@/components/trust-strip";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Customers",
  description:
    "Real businesses running on VoidCard. Tap a card, see a profile, watch the wow.",
  path: "/customers",
});

type Customer = {
  handle: string;
  name: string;
  role: string;
  quote: string;
};

// Seeded examples only — replace with filmed testimonials in days 31–60.
const CUSTOMERS: Customer[] = [
  {
    handle: "voidluxury",
    name: "Void Luxury Detailing",
    role: "Auto detailing studio · Phoenix, AZ",
    quote:
      "I hand someone a metal card and they assume my work is high-end before they've seen a single photo. The card sells the booking.",
  },
];

export default function CustomersPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-6 pb-12 pt-20 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-700">Customers</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight md:text-6xl">
          Real cards, <span className="text-ink">real profiles</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-500">
          We&rsquo;d rather show one real customer than fake ten. This list grows as we ship.
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-16 md:grid-cols-2 lg:grid-cols-3">
        {CUSTOMERS.map((c) => (
          <Link
            key={c.handle}
            href={`/u/${c.handle}`}
            className="surface flex flex-col p-6 transition hover:ring-1 hover:ring-gold/40"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-ink-700">@{c.handle}</p>
            <h2 className="mt-2 font-display text-2xl">{c.name}</h2>
            <p className="mt-1 text-sm text-ink-400">{c.role}</p>
            <p className="mt-4 flex-1 text-sm text-ink-500">&ldquo;{c.quote}&rdquo;</p>
            <span className="mt-5 text-sm text-ink-700">View live profile →</span>
          </Link>
        ))}
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="surface p-7 text-center">
          <h2 className="font-display text-2xl">Run your business on VoidCard?</h2>
          <p className="mt-2 text-ink-500">
            We&rsquo;re recruiting five customers across detailers, brokers, and creators for filmed
            30-second stories. No actors, no scripts.
          </p>
          <Link href="/contact" className="btn-primary mt-5 inline-flex">Tell us your story</Link>
        </div>
      </section>

      <TrustStrip />
      <SiteFooter />
    </main>
  );
}
