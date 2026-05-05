import Link from "next/link";
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

export default function TrustPage() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-16">
      <p className="text-xs uppercase tracking-[0.3em] text-ivory-mute">Trust</p>
      <h1 className="mt-3 font-display text-4xl text-gold-grad">Built on onyx, secured in gold.</h1>
      <p className="mt-4 max-w-2xl text-sm text-ivory-dim">
        We treat your data like our own — encrypted in transit and at rest, isolated by row-level security, audited on every
        admin action. Stripe handles cards (PCI SAQ-A); we never see them. You can export or delete everything at any time.
      </p>

      <div className="mt-10 grid gap-3 md:grid-cols-2">
        {TILES.map((t) => (
          <Link key={t.href} href={t.href} className="card p-5 hover:border-gold/40">
            <p className="font-display text-base text-ivory">{t.title}</p>
            <p className="mt-1 text-sm text-ivory-mute">{t.desc}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}
