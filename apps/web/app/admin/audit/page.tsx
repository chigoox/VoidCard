import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  actor_id: string | null;
  actor_role: string | null;
  action: string;
  target_kind: string | null;
  target_id: string | null;
  diff: unknown;
  created_at: string;
};

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<{ action?: string; actor?: string }> }) {
  const sp = await searchParams;
  const sb = createAdminClient();
  let q = sb.from("vcard_audit_log").select("*").order("created_at", { ascending: false }).limit(300);
  if (sp.action) q = q.ilike("action", `%${sp.action}%`);
  if (sp.actor) q = q.eq("actor_id", sp.actor);
  const { data } = await q;
  const rows = (data as Row[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Audit log</h1>
          <p className="mt-1 text-sm text-ivory-mute">Latest 300 privileged actions.</p>
        </div>
        <form className="flex gap-2 text-sm">
          <input name="action" defaultValue={sp.action ?? ""} placeholder="action contains…" className="input" />
          <input name="actor" defaultValue={sp.actor ?? ""} placeholder="actor uuid" className="input" />
          <button className="btn-ghost" type="submit">Filter</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Actor</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Diff</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ivory-mute">No entries.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-xs text-ivory-mute whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs">
                  <div className="font-mono text-ivory-mute">{r.actor_id ? r.actor_id.slice(0, 8) : "system"}</div>
                  {r.actor_role && <div className="text-ivory-mute">{r.actor_role}</div>}
                </td>
                <td className="px-4 py-3 text-xs">
                  <span className="rounded-pill border border-onyx-700/60 px-2 py-0.5">{r.action}</span>
                </td>
                <td className="px-4 py-3 text-xs text-ivory-mute">
                  {r.target_kind ?? "—"}{r.target_id ? ` / ${r.target_id.slice(0, 24)}` : ""}
                </td>
                <td className="px-4 py-3 text-xs text-ivory-mute">
                  <pre className="max-w-[420px] overflow-hidden whitespace-pre-wrap break-all font-mono text-[10px]">
                    {r.diff ? JSON.stringify(r.diff).slice(0, 200) : "—"}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
