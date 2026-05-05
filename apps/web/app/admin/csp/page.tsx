import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Row = {
  id: number;
  document_uri: string | null;
  violated_directive: string | null;
  effective_directive: string | null;
  blocked_uri: string | null;
  source_file: string | null;
  line_number: number | null;
  status_code: number | null;
  created_at: string;
};

export default async function AdminCspPage({ searchParams }: { searchParams: Promise<{ d?: string }> }) {
  const sp = await searchParams;
  const sb = createAdminClient();
  let q = sb.from("vcard_csp_reports").select("*").order("created_at", { ascending: false }).limit(300);
  if (sp.d) q = q.ilike("violated_directive", `%${sp.d}%`);
  const { data: rows } = await q;
  const list = (rows as Row[] | null) ?? [];

  // group counts by directive
  const { data: counts } = await sb
    .from("vcard_csp_reports")
    .select("violated_directive")
    .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());
  const byDirective = new Map<string, number>();
  for (const r of (counts as { violated_directive: string | null }[] | null) ?? []) {
    const k = r.violated_directive ?? "(none)";
    byDirective.set(k, (byDirective.get(k) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">CSP reports</h1>
          <p className="mt-1 text-sm text-ivory-mute">Latest 300 violations &amp; 7-day directive rollup.</p>
        </div>
        <form className="flex gap-2 text-sm">
          <input name="d" defaultValue={sp.d ?? ""} placeholder="directive contains…" className="input" />
          <button className="btn-ghost" type="submit">Filter</button>
        </form>
      </div>

      <div className="card p-4">
        <h2 className="text-xs uppercase tracking-widest text-ivory-mute">Last 7 days by directive</h2>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-2 md:grid-cols-3">
          {[...byDirective.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => (
            <li key={k} className="flex items-center justify-between rounded-md border border-onyx-700/60 px-3 py-2">
              <span className="font-mono text-ivory-mute">{k}</span>
              <span className="tabular-nums text-gold">{v}</span>
            </li>
          ))}
          {byDirective.size === 0 && <li className="text-ivory-mute">No reports in the last 7 days.</li>}
        </ul>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Directive</th>
              <th className="px-4 py-3">Blocked URI</th>
              <th className="px-4 py-3">Document</th>
              <th className="px-4 py-3">Source</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {list.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ivory-mute">No reports.</td></tr>
            )}
            {list.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-3 text-xs text-ivory-mute whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-3 text-xs"><span className="rounded-pill border border-onyx-700/60 px-2 py-0.5">{r.violated_directive ?? "—"}</span></td>
                <td className="px-4 py-3 max-w-[260px] truncate text-xs text-ivory-mute" title={r.blocked_uri ?? ""}>{r.blocked_uri ?? "—"}</td>
                <td className="px-4 py-3 max-w-[220px] truncate text-xs text-ivory-mute" title={r.document_uri ?? ""}>{r.document_uri ?? "—"}</td>
                <td className="px-4 py-3 max-w-[220px] truncate text-xs text-ivory-mute" title={r.source_file ?? ""}>
                  {r.source_file ? `${r.source_file}${r.line_number ? `:${r.line_number}` : ""}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
