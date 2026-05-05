import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "DPIA Register",
  description: "VoidCard data protection impact assessment stubs for analytics, contact exchange, and custom domains.",
  path: "/legal/dpia",
});

const ITEMS = [
  {
    slug: "analytics",
    title: "Analytics DPIA",
    desc: "Pseudonymous event analytics, consent gating, and retention controls.",
  },
  {
    slug: "exchange",
    title: "Contact exchange DPIA",
    desc: "Visitor-submitted PII captured through one-time exchange tokens.",
  },
  {
    slug: "custom-domains",
    title: "Custom domains DPIA",
    desc: "Domain ownership proof, DNS verification, and routing data risks.",
  },
];

export default function DpiaIndexPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-ivory-mute">Trust</p>
      <h1 className="mt-3 font-display text-4xl text-gold-grad">DPIA register</h1>
      <p className="mt-4 max-w-2xl text-sm text-ivory-dim">
        These stubs document the data protection impact reviews we maintain for higher-risk product surfaces.
      </p>

      <div className="mt-10 grid gap-3 md:grid-cols-3">
        {ITEMS.map((item) => (
          <Link key={item.slug} href={`/legal/dpia/${item.slug}`} className="card p-5 hover:border-gold/40">
            <p className="font-display text-base text-ivory">{item.title}</p>
            <p className="mt-1 text-sm text-ivory-mute">{item.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}