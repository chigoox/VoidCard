import { createAdminClient } from "@/lib/supabase/admin";
import { deleteShortlink } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  code: string;
  user_id: string | null;
  target: string;
  hits: number;
  expires_at: string | null;
  created_at: string;
};

export default async function AdminShortlinksPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const sb = createAdminClient();
  let q = sb.from("vcard_shortlinks").select("*").order("created_at", { ascending: false }).limit(200);
  if (sp.q) q = q.ilike("code", `%${sp.q}%`);
  const { data } = await q;
  const rows = (data as Row[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Shortlinks</h1>
          <p className="mt-1 text-sm text-ivory-mute">Latest 200 by creation date.</p>
        </div>
        <form className="flex gap-2 text-sm">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="code" className="input" />
          <button className="btn-ghost" type="submit">Filter</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Target</th>
              <th className="px-4 py-3">Hits</th>
              <th className="px-4 py-3">Expires</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ivory-mute">No shortlinks.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.code}>
                <td className="px-4 py-3 font-mono text-xs text-gold">/s/{r.code}</td>
                <td className="px-4 py-3 max-w-[400px] truncate text-xs text-ivory-mute" title={r.target}>{r.target}</td>
                <td className="px-4 py-3 tabular-nums">{r.hits}</td>
                <td className="px-4 py-3 text-xs text-ivory-mute">
                  {r.expires_at ? new Date(r.expires_at).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3">
                  <form action={deleteShortlink}>
                    <input type="hidden" name="code" value={r.code} />
                    <button className="text-xs text-red-400 hover:underline" type="submit">delete</button>
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
