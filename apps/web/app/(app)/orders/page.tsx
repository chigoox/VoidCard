import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

function fmtCents(cents: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(cents / 100);
}

const STATUS_PILL: Record<string, string> = {
  pending: "bg-onyx-700 text-ivory-dim",
  paid: "bg-emerald-900 text-emerald-200",
  fulfilled: "bg-emerald-900 text-emerald-200",
  shipped: "bg-blue-900 text-blue-200",
  delivered: "bg-emerald-900 text-emerald-200",
  refunded: "bg-amber-900 text-amber-200",
  canceled: "bg-red-900 text-red-200",
};

export default async function OrdersPage() {
  const user = await requireUser();
  const sb = await createClient();

  const { data: orders } = await sb
    .from("vcard_orders")
    .select(
      "id, status, total_cents, currency, tracking_number, carrier, shipped_at, delivered_at, created_at, vcard_order_items(sku, qty, price_cents)"
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold-grad">Your orders</h1>

      {(!orders || orders.length === 0) && (
        <div className="rounded-lg border border-onyx-700 bg-onyx-900 p-6 text-center text-ivory-dim">
          You haven&apos;t placed any orders yet.
        </div>
      )}

      <ul className="space-y-3">
        {orders?.map((o) => {
          type Item = { sku: string; qty: number; price_cents: number };
          const items = (o.vcard_order_items ?? []) as Item[];
          return (
            <li
              key={o.id}
              data-testid="order-row"
              className="rounded-lg border border-onyx-700 bg-onyx-900 p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <div>
                  <div className="font-mono text-xs text-ivory-dim">
                    #{o.id.slice(0, 8)}
                  </div>
                  <div className="text-sm text-ivory">
                    {fmtCents(o.total_cents, o.currency)}
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={
                      "rounded-md px-2 py-0.5 text-[10px] uppercase tracking-widest " +
                      (STATUS_PILL[o.status] ?? "bg-onyx-700 text-ivory-dim")
                    }
                  >
                    {o.status}
                  </span>
                  <div className="mt-1 text-xs text-ivory-dim">
                    {new Date(o.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>

              {items.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-ivory-dim">
                  {items.map((it, i) => (
                    <li key={i}>
                      {it.qty}× {it.sku} —{" "}
                      {fmtCents(it.price_cents * it.qty, o.currency)}
                    </li>
                  ))}
                </ul>
              )}

              {o.tracking_number && (
                <div className="mt-3 text-xs text-ivory-dim">
                  Tracking: <span className="font-mono text-ivory">{o.tracking_number}</span>
                  {o.carrier && <> · {o.carrier}</>}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
