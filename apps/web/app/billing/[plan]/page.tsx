import { notFound } from "next/navigation";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CheckoutButton } from "@/components/checkout-button";
import { getPlan, formatPrice } from "@/lib/cms";

export const dynamic = "force-dynamic";

const STATIC_FALLBACK: Record<string, { name: string; blurb: string; monthly_cents: number; yearly_cents: number; features: string[] }> = {
  pro: {
    name: "Pro",
    blurb: "For people who hand out their link daily.",
    monthly_cents: 499,
    yearly_cents: 4990,
    features: [
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
  team: {
    name: "Team",
    blurb: "For studios, agencies, and ambitious crews.",
    monthly_cents: 1499,
    yearly_cents: 14990,
    features: [
      "Everything in Pro",
      "10 seats included",
      "Brand kit + shared assets",
      "Roles & permissions",
      "250 GB pooled storage",
      "Priority support",
    ],
  },
};

export default async function BillingPlanPage({
  params,
  searchParams,
}: {
  params: Promise<{ plan: string }>;
  searchParams: Promise<{ year?: string }>;
}) {
  const { plan } = await params;
  if (!["pro", "team"].includes(plan)) notFound();
  const sp = await searchParams;
  const isYear = sp.year === "1";

  const dbPlan = await getPlan(plan);
  const data = dbPlan
    ? {
        name: dbPlan.name,
        blurb: dbPlan.blurb ?? STATIC_FALLBACK[plan].blurb,
        monthly_cents: dbPlan.monthly_cents,
        yearly_cents: dbPlan.yearly_cents,
        features: dbPlan.features?.length ? dbPlan.features : STATIC_FALLBACK[plan].features,
      }
    : STATIC_FALLBACK[plan];

  const cents = isYear ? data.yearly_cents : data.monthly_cents;
  const cadence = isYear ? "/year" : "/month";

  return (
    <main className="home-theme min-h-screen bg-onyx-grad">
      <SiteHeader />
      <section className="mx-auto max-w-3xl px-6 pb-24 pt-20">
        <p className="text-sm uppercase tracking-[0.2em] text-gold">Upgrade</p>
        <h1 className="mt-3 font-display text-5xl text-gold-grad">{data.name}</h1>
        <p className="mt-3 text-lg text-ivory-dim">{data.blurb}</p>

        <div className="card mt-8 p-7">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-display text-5xl text-gold-grad">{formatPrice(cents)}</span>
              <span className="ml-2 text-sm text-ivory-mute">{cadence}</span>
            </div>
            <div className="flex gap-2 text-xs">
              <Link
                href={`/billing/${plan}`}
                className={`rounded-pill px-3 py-1.5 ${!isYear ? "bg-gold-grad text-onyx-950" : "border border-onyx-700/60 text-ivory-dim"}`}
              >
                Monthly
              </Link>
              <Link
                href={`/billing/${plan}?year=1`}
                className={`rounded-pill px-3 py-1.5 ${isYear ? "bg-gold-grad text-onyx-950" : "border border-onyx-700/60 text-ivory-dim"}`}
              >
                Yearly · save 17%
              </Link>
            </div>
          </div>

          <ul className="mt-6 space-y-2 text-sm text-ivory-dim">
            {data.features.map((f) => (
              <li key={f} className="flex gap-2">
                <span className="text-gold">✓</span>
                <span>{f}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7">
            <CheckoutButton kind="subscribe" plan={isYear ? `${plan}_year` : plan} label={`Subscribe to ${data.name}`} />
          </div>
          <p className="mt-3 text-xs text-ivory-mute">
            Secure checkout via Stripe. Cancel anytime from your account.
          </p>
        </div>

        <p className="mt-6 text-sm text-ivory-mute">
          <Link href="/pricing" className="hover:text-ivory">← Back to pricing</Link>
        </p>
      </section>
      <SiteFooter />
    </main>
  );
}
