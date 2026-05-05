import { notFound } from "next/navigation";
import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/cms";
import { updateOrder } from "../actions";

export const dynamic = "force-dynamic";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = createAdminClient();
  const [{ data: order }, { data: items }] = await Promise.all([
    sb.from("vcard_orders").select("*").eq("id", id).maybeSingle(),
    sb.from("vcard_order_items").select("*").eq("order_id", id),
  ]);
  if (!order) notFound();

  const o = order as {
    id: string;
    email: string;
    status: string;
    total_cents: number;
    subtotal_cents: number;
    tax_cents: number;
    shipping_cents: number;
    currency: string;
    tracking_number: string | null;
    carrier: string | null;
    shipping_address: Record<string, unknown> | null;
    created_at: string;
    stripe_session_id: string | null;
    stripe_payment_intent: string | null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-gold-grad">Order {o.id.slice(0, 8)}</h1>
        <Link href="/admin/orders" className="text-sm text-ivory-mute hover:text-ivory">← All orders</Link>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="card p-5 md:col-span-2">
          <h2 className="mb-3 font-display text-xl">Items</h2>
          <ul className="divide-y divide-onyx-700/60 text-sm">
            {(items as Array<{ id: string; sku: string; qty: number; price_cents: number }> | null ?? []).map((it) => (
              <li key={it.id} className="flex justify-between py-2">
                <span className="text-ivory">{it.sku} × {it.qty}</span>
                <span className="font-display text-gold-grad">{formatPrice(it.price_cents * it.qty, o.currency)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-1 border-t border-onyx-700/60 pt-3 text-sm text-ivory-dim">
            <Row label="Subtotal" value={formatPrice(o.subtotal_cents, o.currency)} />
            <Row label="Shipping" value={formatPrice(o.shipping_cents, o.currency)} />
            <Row label="Tax" value={formatPrice(o.tax_cents, o.currency)} />
            <Row label="Total" value={formatPrice(o.total_cents, o.currency)} bold />
          </div>
        </div>

        <div className="space-y-4">
          <div className="card p-5 text-sm">
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Customer</p>
            <p className="mt-2 text-ivory">{o.email}</p>
            <p className="mt-2 text-xs text-ivory-mute">{new Date(o.created_at).toLocaleString()}</p>
            {o.stripe_session_id && <p className="mt-2 break-all text-xs text-ivory-mute">{o.stripe_session_id}</p>}
          </div>

          {o.shipping_address && (
            <div className="card p-5 text-sm">
              <p className="text-xs uppercase tracking-widest text-ivory-mute">Ship to</p>
              <pre className="mt-2 whitespace-pre-wrap text-xs text-ivory">{JSON.stringify(o.shipping_address, null, 2)}</pre>
            </div>
          )}
        </div>
      </div>

      <form action={updateOrder} className="card grid gap-4 p-6 md:grid-cols-4">
        <input type="hidden" name="id" value={o.id} />
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-ivory-mute">Status</span>
          <select name="status" defaultValue={o.status} className="input mt-1.5">
            {["pending","paid","fulfilled","shipped","delivered","refunded","canceled"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-ivory-mute">Carrier</span>
          <input name="carrier" defaultValue={o.carrier ?? ""} className="input mt-1.5" placeholder="USPS / UPS / DHL" />
        </label>
        <label className="block md:col-span-2">
          <span className="text-xs uppercase tracking-widest text-ivory-mute">Tracking number</span>
          <input name="tracking_number" defaultValue={o.tracking_number ?? ""} className="input mt-1.5 font-mono" />
        </label>
        <button type="submit" className="btn-gold md:col-span-4 md:w-fit">Update order</button>
      </form>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span className={bold ? "font-display text-ivory" : ""}>{value}</span>
    </div>
  );
}
