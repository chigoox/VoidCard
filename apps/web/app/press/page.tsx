import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustStrip } from "@/components/trust-strip";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Press kit",
  description: "Logos, screenshots, and fact sheet for press and partners.",
  path: "/press",
});

const FACTS: { label: string; value: string }[] = [
  { label: "Founded", value: "2025" },
  { label: "Parent", value: "ED5 Enterprise" },
  { label: "Headquarters", value: "United States" },
  { label: "Pricing", value: "Free forever · Pro $4.99/mo · Team $14.99/mo" },
  { label: "Hardware", value: "PVC $19 · Metal $29 · Custom Art $49" },
  { label: "Stack", value: "Next.js · Supabase · Stripe · Vercel" },
];

export default function PressPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-6 pb-12 pt-20 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-700">Press</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight md:text-6xl">
          Press <span className="text-ink">kit</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-500">
          Writing about VoidCard? Everything you need is on this page. Need something else?{" "}
          <Link href="/contact" className="text-ink-700 hover:underline">Ask us</Link>.
        </p>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-12">
        <div className="surface p-7">
          <h2 className="font-display text-2xl">One-line description</h2>
          <p className="mt-3 text-ink-500">
            VoidCard is the metal-NFC card and link-in-bio profile that look like luxury out of the
            box and stay free forever — because we sell the card, not the software.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-12">
        <div className="surface p-7">
          <h2 className="font-display text-2xl">Fact sheet</h2>
          <dl className="mt-5 grid gap-4 sm:grid-cols-2">
            {FACTS.map((f) => (
              <div key={f.label}>
                <dt className="text-xs uppercase tracking-widest text-ink-400">{f.label}</dt>
                <dd className="mt-1 text-ink">{f.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-12">
        <div className="surface p-7">
          <h2 className="font-display text-2xl">Boilerplate</h2>
          <p className="mt-3 text-ink-500">
            VoidCard pairs a real metal NFC card with a customizable profile that converts every tap
            into a contact, a booking, or a sale. Built on the ED5 Enterprise stack and free
            forever, VoidCard sells the card so the software never has to paywall the basics.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 pb-24">
        <div className="surface p-7">
          <h2 className="font-display text-2xl">Contact</h2>
          <p className="mt-3 text-ink-500">
            Press inquiries:{" "}
            <a href="mailto:press@vcard.ed5enterprise.com" className="text-ink-700 hover:underline">
              press@vcard.ed5enterprise.com
            </a>
            <br />
            General contact:{" "}
            <Link href="/contact" className="text-ink-700 hover:underline">/contact</Link>
          </p>
        </div>
      </section>

      <TrustStrip />
      <SiteFooter />
    </main>
  );
}
