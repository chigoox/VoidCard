import { createAdminClient } from "@/lib/supabase/admin";
import { batchCreateCards, disableCard } from "./actions";
import { AdminNfcWriter } from "./AdminNfcWriter";

export const dynamic = "force-dynamic";

type Card = {
  id: string;
  serial: string;
  sku: string;
  user_id: string | null;
  status: string;
  last_tap_at: string | null;
  total_taps: number;
  created_at: string;
};

export default async function AdminCardsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const sp = await searchParams;
  const sb = createAdminClient();
  let q = sb.from("vcard_cards").select("*").order("created_at", { ascending: false }).limit(200);
  if (sp.status) q = q.eq("status", sp.status);
  if (sp.q) q = q.ilike("serial", `%${sp.q}%`);
  const { data } = await q;
  const cards = (data as Card[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Cards</h1>
          <p className="mt-1 text-sm text-ivory-mute">Latest 200 by creation date.</p>
        </div>
        <form className="flex flex-wrap gap-2 text-sm">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="serial" className="input" />
          <select name="status" defaultValue={sp.status ?? ""} className="input">
            <option value="">all</option>
            <option value="unprovisioned">unprovisioned</option>
            <option value="sold">sold</option>
            <option value="active">active</option>
            <option value="lost">lost</option>
            <option value="replaced">replaced</option>
          </select>
          <button className="btn-ghost" type="submit">Filter</button>
        </form>
      </div>

      <form action={batchCreateCards} className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-ivory-mute">Batch size</label>
          <input name="count" type="number" min="1" max="500" defaultValue="25" className="input w-24" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-ivory-mute">SKU</label>
          <select name="sku" className="input" defaultValue="card-pvc">
            <option value="card-pvc">card-pvc</option>
            <option value="card-metal">card-metal</option>
            <option value="card-custom">card-custom</option>
            <option value="keychain">keychain</option>
          </select>
        </div>
        <button type="submit" className="btn-primary">Create batch</button>
        <span className="text-xs text-ivory-mute">Creates unprovisioned cards with random serials.</span>
      </form>

      <div className="space-y-3 md:hidden">
        {cards.length === 0 ? (
          <div className="card px-4 py-8 text-center text-sm text-ivory-mute">No cards.</div>
        ) : (
          cards.map((c) => (
            <div key={c.id} className="card space-y-4 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-widest text-ivory-mute">Serial</p>
                  <p className="mt-1 truncate font-mono text-sm text-ivory">{c.serial}</p>
                </div>
                <span className={`shrink-0 rounded-pill border px-2 py-1 text-[11px] ${c.status === "active" ? "border-emerald-500/40 text-emerald-400" : "border-onyx-700/60 text-ivory-mute"}`}>
                  {c.status}
                </span>
              </div>

              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-widest text-ivory-mute">SKU</dt>
                  <dd className="mt-1 text-ivory">{c.sku}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-widest text-ivory-mute">Taps</dt>
                  <dd className="mt-1 tabular-nums text-ivory">{c.total_taps}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-widest text-ivory-mute">Owner</dt>
                  <dd className="mt-1 text-ivory-mute">{c.user_id ? c.user_id.slice(0, 8) : "-"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-widest text-ivory-mute">Last tap</dt>
                  <dd className="mt-1 text-ivory-mute">{c.last_tap_at ? new Date(c.last_tap_at).toLocaleDateString() : "-"}</dd>
                </div>
              </dl>

              <div className="flex items-center justify-between gap-3 border-t border-onyx-800 pt-3">
                <AdminNfcWriter cardId={c.id} serial={c.serial} currentStatus={c.status} />
                <form action={disableCard}>
                  <input type="hidden" name="id" value={c.id} />
                  <button className="text-xs text-red-400 hover:underline" type="submit">disable</button>
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
              <th className="px-4 py-3">Serial</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Owner</th>
              <th className="px-4 py-3">Taps</th>
              <th className="px-4 py-3">Last tap</th>
              <th className="px-4 py-3">NFC</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {cards.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-ivory-mute">No cards.</td></tr>
            )}
            {cards.map((c) => (
              <tr key={c.id}>
                <td className="px-4 py-3 font-mono text-xs text-ivory">{c.serial}</td>
                <td className="px-4 py-3 text-xs">{c.sku}</td>
                <td className="px-4 py-3 text-xs">
                  <span className={`rounded-pill border px-2 py-0.5 ${c.status === "active" ? "border-emerald-500/40 text-emerald-400" : "border-onyx-700/60 text-ivory-mute"}`}>
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-xs text-ivory-mute">{c.user_id ? c.user_id.slice(0, 8) : "—"}</td>
                <td className="px-4 py-3 tabular-nums">{c.total_taps}</td>
                <td className="px-4 py-3 text-xs text-ivory-mute">
                  {c.last_tap_at ? new Date(c.last_tap_at).toLocaleString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <AdminNfcWriter cardId={c.id} serial={c.serial} currentStatus={c.status} />
                </td>
                <td className="px-4 py-3">
                  <form action={disableCard}>
                    <input type="hidden" name="id" value={c.id} />
                    <button className="text-xs text-red-400 hover:underline" type="submit">disable</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
