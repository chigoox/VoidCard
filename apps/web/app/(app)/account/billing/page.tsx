import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const u = await requireUser();
  const sb = await createClient();
  const { data: sub } = await sb
    .from("vcard_subscriptions")
    .select("plan, interval, status, current_period_end, cancel_at_period_end, seats")
    .eq("user_id", u.id)
    .maybeSingle();

  const { data: orders } = await sb
    .from("vcard_orders")
    .select("id, total_cents, currency, status, created_at")
    .eq("user_id", u.id)
    .order("created_at", { ascending: false })
    .limit(20);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl text-gold-grad">Billing</h1>
        <p className="mt-1 text-sm text-ivory-dim">Subscription, invoices, and orders.</p>
      </header>

      <section className="card p-6">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">Subscription</p>
        {sub ? (
          <div className="mt-2 space-y-1 text-sm">
            <p>
              <span className="font-display text-xl">{sub.plan.toUpperCase()}</span>
              <span className="ml-2 text-ivory-dim">/ {sub.interval}</span>
            </p>
            <p className="text-ivory-dim">Status: {sub.status}</p>
            {sub.current_period_end && (
              <p className="text-ivory-dim">
                Renews: {new Date(sub.current_period_end).toLocaleDateString()}
              </p>
            )}
            {sub.cancel_at_period_end && (
              <p className="text-warning">Cancels at period end.</p>
            )}
          </div>
        ) : (
          <div className="mt-2">
            <p className="text-sm text-ivory-dim">You&apos;re on Free. Upgrade for custom domain, multi-profile, API.</p>
            <Link href="/pricing" className="btn-gold mt-3 inline-flex">See Pro</Link>
          </div>
        )}
      </section>

      <section className="card p-6">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">Orders</p>
        {orders && orders.length > 0 ? (
          <ul className="mt-3 divide-y divide-onyx-700 text-sm">
            {orders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-2">
                <span className="text-ivory-dim">{new Date(o.created_at).toLocaleDateString()}</span>
                <span className="text-gold">
                  ${(o.total_cents / 100).toFixed(2)} {o.currency.toUpperCase()}
                </span>
                <span className="text-xs uppercase tracking-widest text-ivory-mute">{o.status}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-ivory-dim">No orders yet. Visit the <Link href="/shop" className="text-gold">shop</Link>.</p>
        )}
      </section>
    </div>
  );
}
