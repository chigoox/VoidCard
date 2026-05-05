import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustStrip } from "@/components/trust-strip";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Why VoidCard — Free forever, premium by default",
  description:
    "We sell the card, not the software. See how VoidCard compares to Linktree, dotcards, Popl, and Blinq.",
  path: "/why-voidcard",
});

type Row = {
  feature: string;
  voidcard: string;
  dotcards: string;
  popl: string;
  linktree: string;
};

const ROWS: Row[] = [
  {
    feature: "Profile cost",
    voidcard: "Free forever",
    dotcards: "Sub required for full features",
    popl: "Watermarked free",
    linktree: "$5–$24 / mo for basics",
  },
  {
    feature: "Themes + custom CSS",
    voidcard: "All 12 + full CSS, free",
    dotcards: "Templated",
    popl: "Limited",
    linktree: "Templated",
  },
  {
    feature: "All 17 section types",
    voidcard: "Free",
    dotcards: "Partial",
    popl: "Partial",
    linktree: "Partial",
  },
  {
    feature: "Wallet pass + embed widget",
    voidcard: "Free",
    dotcards: "—",
    popl: "Paid",
    linktree: "Paid",
  },
  {
    feature: "Full analytics",
    voidcard: "Free",
    dotcards: "Basic",
    popl: "Paid",
    linktree: "Paid",
  },
  {
    feature: "NFC card hardware",
    voidcard: "$19–$49 one-time",
    dotcards: "$25–$45",
    popl: "$24.99–$59.99",
    linktree: "—",
  },
  {
    feature: "Apple/Google Wallet",
    voidcard: "Free",
    dotcards: "—",
    popl: "Paid tier",
    linktree: "—",
  },
  {
    feature: "Custom domain",
    voidcard: "Pro $4.99/mo",
    dotcards: "Paid",
    popl: "Paid",
    linktree: "Paid",
  },
  {
    feature: "API + webhooks",
    voidcard: "Pro $4.99/mo",
    dotcards: "—",
    popl: "Enterprise",
    linktree: "—",
  },
  {
    feature: "Account deletion",
    voidcard: "One click, 30 sec",
    dotcards: "Email support",
    popl: "Email support",
    linktree: "Email support",
  },
];

export default function WhyVoidCardPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-6 pb-12 pt-20 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-700">Why VoidCard</p>
        <h1 className="mt-3 font-display text-5xl leading-tight tracking-tight md:text-6xl">
          We sell the <span className="text-ink">card</span>, not the software.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-500">
          Every other link-in-bio paywalls the basics. Every other NFC card treats the software as
          an afterthought. We do the opposite: free profile that looks like luxury out of the box,
          and a real piece of metal in your pocket when you want the wow.
        </p>
      </section>

      {/* Three claims */}
      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-16 md:grid-cols-3">
        {[
          {
            title: "Free forever — really",
            body:
              "All 12 themes, full custom CSS, every section type, wallet pass, embed, full analytics. No tap caps, no view caps, no link caps. The only hard limit is 5 GB of media.",
            link: { label: "See what's free", href: "/pricing" },
          },
          {
            title: "Premium by default",
            body:
              "Onyx Gold is the out-of-box look — pure black, gold hairline, serif display. You don't have to design taste in. Most people never change it.",
            link: { label: "See a live profile", href: "/u/voidluxury" },
          },
          {
            title: "Your card pairs in 30 seconds",
            body:
              "Tap the card to your phone, sign in, done. Replacement cards re-pair in 30 seconds. Cards never expire and never need our app on the receiver's phone.",
            link: { label: "Browse cards", href: "/shop" },
          },
        ].map((c) => (
          <div key={c.title} className="surface flex flex-col p-6">
            <h2 className="font-display text-2xl text-ink">{c.title}</h2>
            <p className="mt-3 flex-1 text-sm text-ink-500">{c.body}</p>
            <Link href={c.link.href} className="btn-outline mt-5 self-start">
              {c.link.label}
            </Link>
          </div>
        ))}
      </section>

      {/* Comparison */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <h2 className="font-display text-3xl tracking-tight">How we compare</h2>
        <p className="mt-2 text-sm text-ink-400">
          Pricing and features verified May 2026. We&rsquo;ll update this table whenever they
          change — or call us out at{" "}
          <Link href="/contact" className="text-ink-700 hover:underline">/contact</Link>.
        </p>

        <div className="mt-6 overflow-x-auto rounded-card border border-paper-200">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-paper-50/60 text-xs uppercase tracking-wider text-ink-400">
              <tr>
                <th className="px-4 py-3 font-semibold">Feature</th>
                <th className="px-4 py-3 font-semibold text-ink-700">VoidCard</th>
                <th className="px-4 py-3 font-semibold">dotcards</th>
                <th className="px-4 py-3 font-semibold">Popl</th>
                <th className="px-4 py-3 font-semibold">Linktree</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-paper-200 text-ink-500">
              {ROWS.map((r) => (
                <tr key={r.feature}>
                  <td className="px-4 py-3 text-ink">{r.feature}</td>
                  <td className="px-4 py-3 text-ink-700">{r.voidcard}</td>
                  <td className="px-4 py-3">{r.dotcards}</td>
                  <td className="px-4 py-3">{r.popl}</td>
                  <td className="px-4 py-3">{r.linktree}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* The promise */}
      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="surface p-7">
          <h2 className="font-display text-2xl">The promise we won&rsquo;t break</h2>
          <ul className="mt-4 space-y-2.5 text-sm text-ink-500">
            <li className="flex gap-2"><span className="text-ink-700">·</span> Free will always include themes, custom CSS, every section type, wallet pass, embed, full analytics.</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> No tap caps, no view caps, no link caps — ever.</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> No banner ads, no upsell modals on Free features.</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> Cancel Pro any time. Cancel button is the same size as the upgrade button.</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> Delete your account from Settings. Personal data is purged within 30 seconds.</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> 30-day no-questions-asked refund on physical cards.</li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary">Start free</Link>
            <Link href="/shop" className="btn-outline">Get your card</Link>
          </div>
        </div>
      </section>

      <TrustStrip />
      <SiteFooter />
    </main>
  );
}
