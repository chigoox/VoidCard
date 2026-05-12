import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustStrip } from "@/components/trust-strip";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Trust",
  description: "VoidCard security, privacy, and reliability commitments.",
  path: "/trust",
});

const TILES = [
  { href: "/privacy", title: "Privacy policy", desc: "What we collect, why, and how to control it." },
  { href: "/terms", title: "Terms of service", desc: "The contract that governs your use of VoidCard." },
  { href: "/legal/cookies", title: "Cookie policy", desc: "Essential vs. optional cookies." },
  { href: "/legal/dpa", title: "Data Processing Addendum", desc: "GDPR DPA + SCCs for B2B customers." },
  { href: "/legal/dpia", title: "DPIA register", desc: "Impact assessments for higher-risk processing flows." },
  { href: "/legal/subprocessors", title: "Subprocessors", desc: "Third parties we use to run the service." },
  { href: "/legal/security", title: "Security & disclosure", desc: "Vulnerability reporting + safe harbor." },
];

const LIVE_PROOFS = [
  "Stripe-hosted checkout, so VoidCard never sees card numbers.",
  "Supabase row-level security and admin audit trails protect account data.",
  "Privacy, terms, cookie, DPA, DPIA, subprocessors, and security pages are published.",
  "Public changelog and status link are visible before purchase.",
];

const NEXT_PROOFS = [
  "One-click account export ZIP in Account -> Privacy & data.",
  "Self-serve account deletion with confirmation email.",
  "Quarterly uptime/security summary in the changelog.",
];

export default function TrustPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <SiteHeader />

      <section className="mx-auto max-w-4xl px-6 pb-12 pt-20 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-700">Trust</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight md:text-6xl">Proof beats promises.</h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-500">
          We publish the boring details because your card only works if people trust the page it opens.
          Stripe handles payments, legal docs are public, and uptime is visible before you buy.
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-16 md:grid-cols-2">
        <div className="surface p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-700">Live now</p>
          <ul className="mt-4 space-y-3 text-sm text-ink-500">
            {LIVE_PROOFS.map((proof) => (
              <li key={proof} className="flex gap-2"><span className="text-ink-700">·</span>{proof}</li>
            ))}
          </ul>
        </div>
        <div className="surface p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-700">Next proof artifacts</p>
          <ul className="mt-4 space-y-3 text-sm text-ink-500">
            {NEXT_PROOFS.map((proof) => (
              <li key={proof} className="flex gap-2"><span className="text-ink-700">·</span>{proof}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-3 px-6 pb-16 md:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="surface p-5 transition hover:ring-1 hover:ring-ink/20">
            <p className="font-display text-base text-ink">{t.title}</p>
            <p className="mt-1 text-sm text-ink-500">{t.desc}</p>
          </Link>
        ))}
        <a href="https://status.ed5enterprise.com" target="_blank" rel="noreferrer" className="surface p-5 transition hover:ring-1 hover:ring-ink/20">
          <p className="font-display text-base text-ink">Status page</p>
          <p className="mt-1 text-sm text-ink-500">Shared ED5 uptime and incident updates.</p>
        </a>
        <Link href="/changelog" className="surface p-5 transition hover:ring-1 hover:ring-ink/20">
          <p className="font-display text-base text-ink">Public changelog</p>
          <p className="mt-1 text-sm text-ink-500">What shipped, when, and why it matters.</p>
        </Link>
      </section>

      <TrustStrip />
      <SiteFooter />
    </main>
  );
}
