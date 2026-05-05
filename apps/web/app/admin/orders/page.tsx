import Link from "next/link";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/cms";

export const dynamic = "force-dynamic";

type Order = {
  id: string;
  email: string;
  status: string;
  total_cents: number;
  currency: string;
  tracking_number: string | null;
  carrier: string | null;
  created_at: string;
};

export default async function AdminOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string; status?: string }> }) {
  const sp = await searchParams;
  const sb = createAdminClient();
  let q = sb.from("vcard_orders").select("*").order("created_at", { ascending: false }).limit(200);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.q) q = q.ilike("email", `%${sp.q}%`);
  const { data } = await q;
  const orders = (data as Order[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Orders</h1>
          <p className="mt-1 text-sm text-ivory-mute">Latest 200. Click to update fulfillment.</p>
        </div>
        <form className="flex gap-2 text-sm">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="search by email" className="input" />
          <select name="status" defaultValue={sp.status ?? ""} className="input">
            <option value="">all status</option>
            {["pending","paid","fulfilled","shipped","delivered","refunded","canceled"].map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
          <button className="btn-ghost" type="submit">Filter</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Tracking</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {orders.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ivory-mute">No orders match.</td></tr>
            )}
            {orders.map((o) => (
              <tr key={o.id}>
                <td className="px-4 py-3 text-xs text-ivory-mute">{new Date(o.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-ivory">{o.email}</td>
                <td className="px-4 py-3">
                  <span className="rounded-pill border border-onyx-700/60 px-2.5 py-0.5 text-xs">{o.status}</span>
                </td>
                <td className="px-4 py-3 font-display text-gold-grad">{formatPrice(o.total_cents, o.currency)}</td>
                <td className="px-4 py-3 text-xs text-ivory-mute">
                  {o.tracking_number ? <code>{o.carrier ?? ""} · {o.tracking_number}</code> : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <Link href={`/admin/orders/${o.id}`} className="text-gold hover:underline">Open</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
