import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { TrustStrip } from "@/components/trust-strip";

import { buildMetadata } from "@/lib/seo";
import { jsonLdScript, faqPage, breadcrumbs } from "@/lib/jsonld";

export const metadata = buildMetadata({
  title: "Pricing — Free forever. Pro $4.99. Team $14.99.",
  description:
    "VoidCard is free forever and powerful by default. Upgrade to Pro for custom domain, multi-profile, lead forms, API + webhooks, and more.",
  path: "/pricing",
});

const FAQ = [
  { q: "Is VoidCard really free forever?", a: "Yes. Free includes all 12 themes, full custom CSS, every section type, wallet pass, embed widget, and full analytics. We make money on the physical card and Pro/Team — never by gating Free features." },
  { q: "What does Pro unlock?", a: "Custom domain, brand removal, up to 10 profiles, two-way contact exchange, lead forms, API + webhooks, custom fonts, password protection, scheduled publishing, A/B variants, CSV export, weekly digest, and 50 GB storage." },
  { q: "What's the Verified Badge?", a: "A one-time $5 upgrade (auto-included with metal/custom/bundle/team purchases) required for custom-art cards, apex custom domains, and non-HTTPS webhooks." },
  { q: "Can I cancel any time?", a: "Yes. Cancel from Account → Billing. The cancel button is the same size as the upgrade button. You stay on Pro/Team until the end of the current period." },
  { q: "Do I need a card to use VoidCard?", a: "No. The profile is fully usable without a card. The card just makes the hand-off faster and more memorable." },
];

type Tier = {
  id: "free" | "pro" | "team";
  name: string;
  price: string;
  cadence: string;
  tagline: string;
  cta: { label: string; href: string };
  highlight?: boolean;
  features: string[];
};

type ComparisonRow = {
  label: string;
  free: string;
  pro: string;
  team: string;
};

const TIERS: Tier[] = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    cadence: "forever",
    tagline: "Powerful by default. Designed to convert.",
    cta: { label: "Start free", href: "/signup" },
    features: [
      "All 12 themes + full custom CSS",
      "All 17 section types",
      "Apple/Google Wallet pass",
      "Embed widget for any site",
      "Full analytics dashboard",
      "1-way contact capture",
      "5 GB storage · 1 profile",
      "1 paired NFC card",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$4.99",
    cadence: "per month",
    tagline: "For people who hand out their link daily.",
    cta: { label: "Go Pro", href: "/signup?next=/billing/pro" },
    highlight: true,
    features: [
      "Everything in Free",
      "Custom domain (apex + subdomain)",
      "Brand removal",
      "Up to 10 profiles + variants",
      "2-way contact exchange",
      "Lead-capture forms",
      "API + webhooks",
      "Custom font upload",
      "Password-protected pages",
      "Scheduled publish + A/B variants",
      "CSV export · weekly digest",
      "50 GB storage",
    ],
  },
  {
    id: "team",
    name: "Team",
    price: "$14.99",
    cadence: "per month",
    tagline: "For studios, agencies, and ambitious crews.",
    cta: { label: "Start Team", href: "/signup?next=/billing/team" },
    features: [
      "Everything in Pro",
      "10 seats included",
      "Brand kit + shared assets",
      "Roles & permissions",
      "250 GB pooled storage",
      "Priority support",
    ],
  },
];

const COMPARISON_ROWS: ComparisonRow[] = [
  { label: "Themes + custom CSS", free: "Included", pro: "Included", team: "Included" },
  { label: "Section types", free: "All 17", pro: "All 17", team: "All 17" },
  { label: "Wallet pass + embed widget", free: "Included", pro: "Included", team: "Included" },
  { label: "Analytics", free: "Included", pro: "Included + CSV", team: "Included + rollups" },
  { label: "1-way contact capture", free: "Included", pro: "Included", team: "Included" },
  { label: "Profiles", free: "1", pro: "Up to 10", team: "Unlimited" },
  { label: "Paired cards", free: "1", pro: "Unlimited", team: "Unlimited" },
  { label: "Storage", free: "5 GB", pro: "50 GB", team: "250 GB pooled" },
  { label: "Custom domain", free: "—", pro: "Included", team: "Included" },
  { label: "Remove branding", free: "—", pro: "Included", team: "Included" },
  { label: "2-way contact exchange", free: "—", pro: "Included", team: "Included" },
  { label: "Lead forms", free: "—", pro: "Included", team: "Included" },
  { label: "API + webhooks", free: "—", pro: "Included", team: "Included" },
  { label: "Custom font upload", free: "—", pro: "Included", team: "Included" },
  { label: "Password protection", free: "—", pro: "Included", team: "Included" },
  { label: "Scheduled publish + A/B", free: "—", pro: "Included", team: "Included" },
  { label: "Seats", free: "1", pro: "1", team: "10" },
  { label: "Brand kit + permissions", free: "—", pro: "—", team: "Included" },
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript([
          faqPage(FAQ),
          breadcrumbs([
            { name: "Home", url: "/" },
            { name: "Pricing", url: "/pricing" },
          ]),
        ])}
      />
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pb-12 pt-20 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-700">Pricing</p>
        <h1 className="mt-3 font-display text-5xl leading-tight tracking-tight md:text-6xl">
          Free is the <span className="text-ink">whole product</span>.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-500">
          Themes, custom CSS, every section, wallet pass, embed, analytics — yours forever.
          Upgrade only when you need a custom domain or a team.
        </p>
        <p className="mt-4 text-sm text-ink-400">
          <Link href="/why-voidcard" className="text-ink-700 hover:underline">See how we compare →</Link>
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-16 md:grid-cols-3">
        {TIERS.map((tier) => (
          <div
            key={tier.id}
            className={`card flex flex-col p-7 ${
              tier.highlight ? "ring-1 ring-gold/60 shadow-soft" : ""
            }`}
          >
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl">{tier.name}</h2>
              {tier.highlight && (
                <span className="rounded-pill bg-ink px-3 py-1 text-xs font-semibold text-white">
                  Most popular
                </span>
              )}
            </div>
            <p className="mt-1 text-sm text-ink-500">{tier.tagline}</p>
            <div className="mt-5 flex items-baseline gap-2">
              <span className="font-display text-5xl text-ink">{tier.price}</span>
              <span className="text-sm text-ink-400">/{tier.cadence}</span>
            </div>
            <ul className="mt-6 space-y-2.5 text-sm text-ink-500">
              {tier.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <span className="text-ink-700">✓</span>
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link
              href={tier.cta.href}
              className={`mt-7 ${tier.highlight ? "btn-primary" : "btn-outline"}`}
            >
              {tier.cta.label}
            </Link>
          </div>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.2em] text-ink-700">Comparison</p>
          <h2 className="mt-3 font-display text-4xl tracking-tight text-ink md:text-5xl">
            The plan table, without the hedge words.
          </h2>
          <p className="mt-4 text-lg text-ink-500">
            Free is the creative product. Pro and Team are the business layers you turn on when the workflow needs them.
          </p>
        </div>

        <div className="mt-8 overflow-x-auto rounded-card border border-paper-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-paper-50 text-ink">
              <tr className="border-b border-paper-200">
                <th className="px-4 py-4 font-medium text-ink md:px-6">Feature</th>
                <th className="px-4 py-4 font-display text-lg md:px-6">Free</th>
                <th className="px-4 py-4 font-display text-lg md:px-6">Pro</th>
                <th className="px-4 py-4 font-display text-lg md:px-6">Team</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row) => (
                <tr key={row.label} className="border-b border-paper-200 last:border-b-0">
                  <th className="px-4 py-4 font-medium text-ink md:px-6">{row.label}</th>
                  <td className="px-4 py-4 text-ink-500 md:px-6">{row.free}</td>
                  <td className="px-4 py-4 text-ink-500 md:px-6">{row.pro}</td>
                  <td className="px-4 py-4 text-ink-500 md:px-6">{row.team}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-12">
        <div className="surface p-7">
          <h3 className="font-display text-2xl">Verified Badge</h3>
          <p className="mt-2 text-ink-500">
            $5 one-time. Auto-granted with metal, custom-art, bundle, or team-5-pack card purchases.
            Required for custom-art card SKU, apex custom domain, and non-HTTPS webhooks.
          </p>
          <Link href="/shop" className="btn-outline mt-5">Browse cards</Link>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24">
        <div className="rounded-card border border-paper-200 bg-paper-50 p-7">
          <h3 className="font-display text-2xl text-ink">What Free will never lose</h3>
          <ul className="mt-4 space-y-2 text-sm text-ink-500">
            <li className="flex gap-2"><span className="text-ink-700">·</span> All 12 themes + full custom CSS</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> All 17 section types</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> Wallet pass, embed, full analytics</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> No tap, view, or link caps</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> No upsell modals on Free features</li>
          </ul>
        </div>
      </section>

      <TrustStrip />
      <SiteFooter />
    </main>
  );
}
