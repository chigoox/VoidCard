import Link from "next/link";
import { CUSTOM_DESIGN_ADDON_SETTING_KEY, getCustomDesignAddonCents, listProducts, formatPrice } from "@/lib/cms";
import { upsertSetting } from "../settings/actions";
import { deleteProduct, syncStripePrices } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const products = await listProducts({ includeInactive: true });
  const customDesignAddonCents = await getCustomDesignAddonCents();
  const sp = (await searchParams) ?? {};
  const synced = sp.synced === "1";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Products</h1>
          <p className="mt-1 text-sm text-ivory-mute">Edit shop SKUs, prices, and Stripe Price IDs.</p>
        </div>
        <div className="flex flex-wrap gap-2">
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

      <form action={upsertSetting} className="card grid gap-4 p-5 md:grid-cols-[1fr_auto_auto] md:items-end">
        <input type="hidden" name="key" value={CUSTOM_DESIGN_ADDON_SETTING_KEY} />
        <div>
          <label htmlFor="custom-design-addon-price" className="text-sm font-medium text-ivory">
            Custom design add-on price
          </label>
          <p className="mt-1 text-xs text-ivory-mute">
            Added to eligible card orders when buyers attach a saved designer file.
          </p>
        </div>
        <input
          id="custom-design-addon-price"
          name="value_json"
          type="number"
          min={0}
          step={1}
          required
          defaultValue={customDesignAddonCents}
          className="input w-full md:w-40"
          aria-label="Custom design add-on price in cents"
        />
        <button className="btn-gold" type="submit">Save add-on price</button>
      </form>

      <div className="space-y-3 md:hidden">
        {products.length === 0 ? (
          <div className="card px-4 py-8 text-center text-sm text-ivory-mute">
            No products. Apply migration <code>0025_vcard_cms.sql</code> or click <em>+ New product</em>.
          </div>
        ) : (
          products.map((p) => (
            <div key={p.id} className="card space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-widest text-ivory-mute">Name</p>
                  <p className="mt-1 truncate text-sm text-ivory">{p.name}</p>
                  <code className="mt-1 block truncate text-xs text-gold">{p.sku}</code>
                </div>
                <span className={`shrink-0 rounded-pill border px-2 py-1 text-[11px] ${p.active ? "border-emerald-500/40 text-emerald-400" : "border-onyx-700/60 text-ivory-mute"}`}>
                  {p.active ? "on" : "off"}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-widest text-ivory-mute">Position</dt>
                  <dd className="mt-1 text-ivory">{p.position}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-widest text-ivory-mute">Price</dt>
                  <dd className="mt-1 font-display text-gold-grad">{formatPrice(p.price_cents, p.currency)}</dd>
                </div>
              </dl>

              <div className="flex items-center justify-between gap-3 border-t border-onyx-800 pt-3 text-sm">
                <Link href={`/admin/products/${p.id}`} className="text-gold hover:underline">Edit</Link>
                <form action={deleteProduct}>
                  <input type="hidden" name="id" value={p.id} />
                  <button type="submit" className="text-rose-400 hover:underline" formNoValidate>
                    Delete
                  </button>
                </form>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="hidden card overflow-hidden md:block">
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
