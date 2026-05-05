import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice, type DbPlan } from "@/lib/cms";
import { upsertPlan } from "./actions";

export const dynamic = "force-dynamic";

async function getPlans(): Promise<DbPlan[]> {
  const sb = createAdminClient();
  const { data } = await sb.from("vcard_plans").select("*").order("position", { ascending: true });
  return (data as DbPlan[] | null) ?? [];
}

export default async function AdminPlansPage() {
  const plans = await getPlans();
  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-gold-grad">Subscription plans</h1>
        <p className="mt-1 text-sm text-ivory-mute">
          Edit Pro / Team plans, pricing, features, and Stripe Price IDs. The Pricing page reads from here.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {plans.length === 0 && (
          <p className="text-sm text-ivory-mute">No plans yet. Apply migration <code>0025_vcard_cms.sql</code>.</p>
        )}
        {plans.map((plan) => (
          <form key={plan.id} action={upsertPlan} className="card space-y-4 p-6">
            <input type="hidden" name="id" value={plan.id} />
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl">{plan.name}</h2>
              <span className="rounded-pill border border-onyx-700/60 px-3 py-0.5 text-xs">{plan.id}</span>
            </div>

            <Field label="Name"><input name="name" required defaultValue={plan.name} className="input" /></Field>
            <Field label="Blurb">
              <textarea name="blurb" rows={2} defaultValue={plan.blurb ?? ""} className="input" />
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Monthly (cents)">
                <input name="monthly_cents" type="number" defaultValue={plan.monthly_cents} className="input" />
                <span className="mt-1 block text-xs text-gold">{formatPrice(plan.monthly_cents)}</span>
              </Field>
              <Field label="Yearly (cents)">
                <input name="yearly_cents" type="number" defaultValue={plan.yearly_cents} className="input" />
                <span className="mt-1 block text-xs text-gold">{formatPrice(plan.yearly_cents)}</span>
              </Field>
            </div>

            {/* Stripe price IDs no longer needed: subscriptions use inline price_data from monthly/yearly cents. */}
            <input type="hidden" name="stripe_price_monthly" value={plan.stripe_price_monthly ?? ""} />
            <input type="hidden" name="stripe_price_yearly" value={plan.stripe_price_yearly ?? ""} />

            <Field label="Features (one per line)">
              <textarea
                name="features_text"
                rows={6}
                defaultValue={(plan.features ?? []).join("\n")}
                className="input font-mono text-xs"
              />
            </Field>

            <div className="flex items-center gap-4">
              <Field label="Position">
                <input name="position" type="number" defaultValue={plan.position} className="input w-24" />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="active" defaultChecked={plan.active} className="h-4 w-4" />
                <span>Active</span>
              </label>
            </div>

            <button type="submit" className="btn-gold">Save plan</button>
          </form>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-ivory-mute">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
