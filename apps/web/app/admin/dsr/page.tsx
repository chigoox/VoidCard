import { createAdminClient } from "@/lib/supabase/admin";
import { markDsrReady, cancelDsr } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  user_id: string;
  kind: string;
  status: string;
  url: string | null;
  url_expires_at: string | null;
  delete_at: string | null;
  error: string | null;
  created_at: string;
  completed_at: string | null;
};

export default async function AdminDsrPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const sp = await searchParams;
  const sb = createAdminClient();
  let q = sb.from("vcard_dsr_log").select("*").order("created_at", { ascending: false }).limit(200);
  if (sp.status) q = q.eq("status", sp.status);
  const { data } = await q;
  const rows = (data as Row[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Data-subject requests</h1>
          <p className="mt-1 text-sm text-ivory-mute">GDPR / CCPA export &amp; delete jobs (latest 200).</p>
        </div>
        <form className="flex gap-2 text-sm">
          <select name="status" defaultValue={sp.status ?? ""} className="input">
            <option value="">all</option>
            <option value="queued">queued</option>
            <option value="processing">processing</option>
            <option value="ready">ready</option>
            <option value="completed">completed</option>
            <option value="failed">failed</option>
            <option value="cancelled">cancelled</option>
          </select>
          <button className="btn-ghost" type="submit">Filter</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Kind</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
              <th className="px-4 py-3">Scheduled</th>
              <th className="px-4 py-3">Error</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {rows.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ivory-mute">No DSR requests.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 font-mono text-xs text-ivory-mute">{r.user_id.slice(0, 8)}</td>
                <td className="px-4 py-3 text-xs">
                  <span className="rounded-pill border border-onyx-700/60 px-2 py-0.5">{r.kind}</span>
                </td>
                <td className="px-4 py-3 text-xs">
                  <span className={`rounded-pill border px-2 py-0.5 ${
                    r.status === "ready" || r.status === "completed" ? "border-emerald-500/40 text-emerald-400"
                      : r.status === "failed" ? "border-red-500/40 text-red-400"
                      : "border-onyx-700/60 text-ivory-mute"
                  }`}>{r.status}</span>
                </td>
                <td className="px-4 py-3 text-xs text-ivory-mute whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs text-ivory-mute whitespace-nowrap">
                  {r.delete_at ? new Date(r.delete_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-red-400">{r.error ?? "—"}</td>
                <td className="px-4 py-3 space-x-2">
                  {r.kind === "export" && r.status === "queued" && (
                    <form action={markDsrReady} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <button className="text-xs text-gold hover:underline" type="submit">mark ready</button>
                    </form>
                  )}
                  {(r.status === "queued" || r.status === "processing") && (
                    <form action={cancelDsr} className="inline">
                      <input type="hidden" name="id" value={r.id} />
                      <button className="text-xs text-red-400 hover:underline" type="submit">cancel</button>
                    </form>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
