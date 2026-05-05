import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { buildMetadata } from "@/lib/seo";

const DPIAS = {
  analytics: {
    title: "Analytics DPIA",
    summary: "Pseudonymous product analytics collected only after consent.",
    data: "Event timestamps, page paths, pseudonymous user ids, hashed IP/UA values, referrers, UTM parameters.",
    lawfulBasis: "Consent for optional analytics, legitimate interests for strictly necessary abuse prevention.",
    risks: "Re-identification through event joins, over-retention, and secondary use beyond product improvement.",
    controls: "Consent banner gating, 30-day raw event retention, rotating IP salts, opt-out respected at ingestion.",
  },
  exchange: {
    title: "Contact Exchange DPIA",
    summary: "Visitor contact details submitted through short-lived exchange tokens.",
    data: "Name, email, phone, company, freeform note, capture timestamp, source metadata.",
    lawfulBasis: "Consent communicated on the form and controller legitimate interests in responding to business inquiries.",
    risks: "Unexpected visitor disclosure, token replay, and excessive retention of business contact details.",
    controls: "15-minute tokens, single-use consumption, server-side rate limits, owner-only access, DSR export/delete support.",
  },
  "custom-domains": {
    title: "Custom Domains DPIA",
    summary: "Customer-managed hostnames mapped to public profiles after DNS proof.",
    data: "Hostname, TXT verification token, DNS status, SSL status, linked account id, audit timestamps.",
    lawfulBasis: "Performance of contract for paid custom-domain routing.",
    risks: "Hostname enumeration, stale routing after ownership changes, and accidental exposure of inactive domains.",
    controls: "DNS TXT verification, active-only public routing, audit logs on status changes, scheduled verification cron.",
  },
} as const;

type DpiaSlug = keyof typeof DPIAS;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (!(slug in DPIAS)) {
    return buildMetadata({
      title: "DPIA",
      description: "VoidCard data protection impact assessment.",
      path: "/legal/dpia",
      noindex: true,
    });
  }

  const dpia = DPIAS[slug as DpiaSlug];
  return buildMetadata({
    title: dpia.title,
    description: dpia.summary,
    path: `/legal/dpia/${slug}`,
  });
}

export default async function DpiaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!(slug in DPIAS)) notFound();
  const dpia = DPIAS[slug as DpiaSlug];

  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-ivory-dim">
      <p className="text-xs uppercase tracking-[0.3em] text-ivory-mute">Trust</p>
      <h1 className="mt-3 font-display text-4xl text-gold-grad">{dpia.title}</h1>
      <p className="mt-4 text-sm">{dpia.summary}</p>

      <div className="mt-8 space-y-6 text-sm">
        <section className="card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ivory-mute">Personal data</p>
          <p className="mt-2">{dpia.data}</p>
        </section>
        <section className="card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ivory-mute">Lawful basis</p>
          <p className="mt-2">{dpia.lawfulBasis}</p>
        </section>
        <section className="card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ivory-mute">Key risks</p>
          <p className="mt-2">{dpia.risks}</p>
        </section>
        <section className="card p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ivory-mute">Controls</p>
          <p className="mt-2">{dpia.controls}</p>
        </section>
      </div>

      <p className="mt-8 text-xs text-ivory-mute">
        Need the controller-facing addendum too? See <Link href="/legal/dpa" className="text-gold underline">the DPA</Link>.
      </p>
    </main>
  );
}