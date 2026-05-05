import Link from "next/link";
import { listProducts, formatPrice } from "@/lib/cms";
import { deleteProduct, syncStripePrices } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const products = await listProducts({ includeInactive: true });
  const sp = (await searchParams) ?? {};
  const synced = sp.synced === "1";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Products</h1>
          <p className="mt-1 text-sm text-ivory-mute">Edit shop SKUs, prices, and Stripe Price IDs.</p>
        </div>
        <div className="flex gap-2">
          <form action={syncStripePrices}>
            <button type="submit" className="btn-ghost">Sync Stripe</button>
          </form>
          <Link href="/admin/products/new" className="btn-gold">+ New product</Link>
        </div>
      </div>

      {synced && (
        <div className="card border-gold/30 px-4 py-3 text-sm text-ivory">
          Stripe sync complete. Matched: {sp.matched ?? 0}, updated: {sp.updated ?? 0}, missing: {sp.missing ?? 0}.
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">Pos</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Price</th>
              <th className="px-4 py-3">Active</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {products.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ivory-mute">
                No products. Apply migration <code>0025_vcard_cms.sql</code> or click <em>+ New product</em>.
              </td></tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="hover:bg-onyx-900/30">
                <td className="px-4 py-3 text-ivory-mute">{p.position}</td>
                <td className="px-4 py-3"><code className="text-gold">{p.sku}</code></td>
                <td className="px-4 py-3 text-ivory">{p.name}</td>
                <td className="px-4 py-3 font-display text-gold-grad">{formatPrice(p.price_cents, p.currency)}</td>
                <td className="px-4 py-3 text-xs">
                  {p.active
                    ? <span className="text-emerald-400">on</span>
                    : <span className="text-ivory-mute">off</span>}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3">
                    <Link href={`/admin/products/${p.id}`} className="text-gold hover:underline">Edit</Link>
                    <form action={deleteProduct}>
                      <input type="hidden" name="id" value={p.id} />
                      <button type="submit" className="text-rose-400 hover:underline" formNoValidate>
                        Delete
                      </button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
