import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBalance, getAiSettings, grantMonthlyIfDue } from "@/lib/credits";
import { CreditsBuyButtons } from "./client";

export const dynamic = "force-dynamic";

const PACKS = [
  { sku: "credits-25", credits: 25, price: "$5", testid: "buy-credits-25" },
  { sku: "credits-100", credits: 100, price: "$15", testid: "buy-credits-100" },
  { sku: "credits-500", credits: 500, price: "$50", testid: "buy-credits-500" },
] as const;

export default async function CreditsPage({ searchParams }: { searchParams: Promise<{ ok?: string }> }) {
  const u = await requireUser();
  const params = await searchParams;
  const justGranted = await grantMonthlyIfDue(u.id, u.plan === "team" ? "team" : u.plan === "pro" ? "pro" : "free");
  const balance = await getBalance(u.id);
  const settings = await getAiSettings();

  const admin = createAdminClient();
  const { data: ledger } = await admin
    .from("vcard_ai_credit_ledger")
    .select("id, delta, reason, created_at, ref_id")
    .eq("user_id", u.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const monthlyByPlan = settings.freeMonthly[u.plan === "team" ? "team" : u.plan === "pro" ? "pro" : "free"];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl text-gold-grad">AI Credits</h1>
        <p className="mt-1 text-sm text-ivory-dim">
          Use credits to generate images with AI right inside the editor.{" "}
          <strong className="text-ivory">{settings.costPerImage}</strong> credit per image.
        </p>
      </header>

      {params?.ok ? (
        <div className="rounded-card border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
          Payment received — your credits have been added.
        </div>
      ) : null}

      <section className="card flex flex-col gap-3 p-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Balance</p>
          <p className="mt-1 font-display text-4xl text-gold-grad" data-testid="credits-balance">
            {balance.balance}
          </p>
          <p className="mt-1 text-xs text-ivory-mute">
            {balance.lifetimeGranted} granted · {balance.lifetimeSpent} spent
          </p>
        </div>
        <div className="text-sm text-ivory-mute">
          <p>
            Free monthly grant on your {u.plan} plan: <strong className="text-ivory">{monthlyByPlan}</strong>
          </p>
          {justGranted ? <p className="text-emerald-300">+{justGranted} credits granted this month.</p> : null}
          <p className="mt-1">Buy a card to get <strong className="text-ivory">{settings.cardBonus}</strong> bonus credits.</p>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-medium text-ivory">Buy more credits</h2>
        <p className="mt-1 text-xs text-ivory-mute">Pay once. Credits never expire.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {PACKS.map((pack) => (
            <CreditsBuyButtons
              key={pack.sku}
              sku={pack.sku}
              credits={pack.credits}
              price={pack.price}
              testid={pack.testid}
            />
          ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-base font-medium text-ivory">Recent activity</h2>
        {(ledger ?? []).length === 0 ? (
          <p className="mt-2 text-sm text-ivory-mute">No credit activity yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-onyx-800 text-sm">
            {(ledger ?? []).map((row) => (
              <li key={row.id} className="flex items-center justify-between py-2">
                <div>
                  <p className="text-ivory">{labelFor(row.reason)}</p>
                  <p className="text-xs text-ivory-mute">
                    {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
                <span
                  className={`rounded-pill px-2 py-0.5 text-xs ${row.delta > 0 ? "bg-emerald-500/10 text-emerald-300" : "bg-onyx-900 text-ivory-mute"}`}
                >
                  {row.delta > 0 ? "+" : ""}
                  {row.delta}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-ivory-mute">
        Need a refund? <Link href="/help" className="text-gold underline-offset-2 hover:underline">Contact support</Link>.
      </p>
    </div>
  );
}

function labelFor(reason: string): string {
  switch (reason) {
    case "monthly_grant":
      return "Monthly free credits";
    case "card_bonus":
      return "Card purchase bonus";
    case "purchase":
      return "Credit pack purchase";
    case "spend":
      return "AI image generation";
    case "refund":
      return "Refund (failed generation)";
    case "admin":
      return "Adjustment";
    default:
      return reason;
  }
}
