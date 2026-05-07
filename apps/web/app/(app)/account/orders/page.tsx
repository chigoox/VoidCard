import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { FulfillButton, RefundButton } from "./client";

export const dynamic = "force-dynamic";

type Order = {
  id: string;
  buyer_email: string | null;
  status: string;
  subtotal_cents: number;
  total_cents: number;
  application_fee_cents: number;
  currency: string;
  items: Array<{ name?: string; quantity?: number; amount_total?: number }>;
  shipping_address: unknown;
  metadata: { tracking_number?: string; carrier?: string } | null;
  created_at: string;
};

function formatMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export default async function OrdersPage() {
  const u = await requireUser();
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_seller_orders")
    .select(
      "id,buyer_email,status,subtotal_cents,total_cents,application_fee_cents,currency,items,shipping_address,metadata,created_at",
    )
    .eq("seller_user_id", u.id)
    .order("created_at", { ascending: false })
    .limit(100);
  const orders = (data ?? []) as Order[];

  const grossCents = orders.reduce((acc, o) => acc + o.total_cents, 0);
  const feesCents = orders.reduce((acc, o) => acc + o.application_fee_cents, 0);
  const currency = orders[0]?.currency ?? "usd";

  return (
    <div className="space-y-5" data-testid="orders-page">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-ivory-mute">Storefront</p>
          <h1 className="font-display text-2xl text-gold-grad">Sales & orders</h1>
          <p className="text-sm text-ivory-dim">
            Orders placed through your Store sections. Payouts arrive in your{" "}
            <Link href="/account/payments" className="text-gold underline-offset-2 hover:underline">
              Stripe dashboard
            </Link>
            .
          </p>
        </div>
        {orders.length > 0 ? (
          <a
            href="/api/seller/orders/export"
            className="btn-ghost text-xs"
            data-testid="orders-csv"
          >
            Export CSV
          </a>
        ) : null}
      </header>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Orders</p>
          <p className="font-display text-2xl text-ivory">{orders.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Gross</p>
          <p className="font-display text-2xl text-gold">{formatMoney(grossCents, currency)}</p>
        </div>
        <div className="card p-4">
          <p className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Platform fees</p>
          <p className="font-display text-2xl text-ivory-dim">{formatMoney(feesCents, currency)}</p>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ivory-dim">
          <p className="font-display text-base text-ivory">No sales yet</p>
          <p className="mt-2">
            Add a{" "}
            <Link href="/edit" className="text-gold underline-offset-2 hover:underline">
              Store section
            </Link>{" "}
            to your profile and connect Stripe to start selling.
          </p>
        </div>
      ) : (
        <ul className="space-y-2" data-testid="orders-list">
          {orders.map((o) => {
            const items = Array.isArray(o.items) ? o.items : [];
            return (
              <li
                key={o.id}
                className="card flex flex-wrap items-center justify-between gap-3 p-4"
                data-testid={`order-row-${o.id}`}
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-ivory-mute">
                      {new Date(o.created_at).toLocaleString()}
                    </span>
                    <span
                      className={`rounded-pill px-2 py-0.5 text-[10px] uppercase tracking-widest ${
                        o.status === "paid"
                          ? "border border-emerald-400/30 bg-emerald-500/10 text-emerald-200"
                          : o.status === "fulfilled"
                          ? "border border-sky-400/30 bg-sky-500/10 text-sky-200"
                          : o.status === "refunded"
                          ? "border border-red-400/30 bg-red-500/10 text-red-200"
                          : "border border-onyx-700 bg-onyx-950/60 text-ivory-mute"
                      }`}
                    >
                      {o.status}
                    </span>
                  </div>
                  <p className="truncate text-sm text-ivory">
                    {items.map((i) => `${i.quantity ?? 1}× ${i.name ?? "item"}`).join(", ") ||
                      "Order"}
                  </p>
                  {o.buyer_email ? (
                    <p className="text-xs text-ivory-mute">{o.buyer_email}</p>
                  ) : null}
                  {o.metadata?.tracking_number ? (
                    <p className="text-xs text-ivory-mute">
                      Tracking: <span className="font-mono">{o.metadata.tracking_number}</span>
                      {o.metadata.carrier ? ` (${o.metadata.carrier})` : ""}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <p className="font-mono text-sm text-gold">
                    {formatMoney(o.total_cents, o.currency)}
                  </p>
                  <p className="font-mono text-[11px] text-ivory-mute">
                    fee {formatMoney(o.application_fee_cents, o.currency)}
                  </p>
                  {o.status === "paid" ? (
                    <div className="flex flex-col items-end gap-1 pt-1">
                      <FulfillButton orderId={o.id} />
                      <RefundButton orderId={o.id} />
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
