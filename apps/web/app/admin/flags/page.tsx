import { createAdminClient } from "@/lib/supabase/admin";
import { upsertFlag, deleteFlag } from "./actions";

export const dynamic = "force-dynamic";

type Flag = {
  key: string;
  enabled: boolean;
  rollout_pct: number;
  payload: unknown;
  description: string | null;
  updated_at: string;
};

export default async function AdminFlagsPage() {
  const sb = createAdminClient();
  const { data } = await sb.from("vcard_flags").select("*").order("key");
  const flags = (data as Flag[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-gold-grad">Feature flags</h1>
        <p className="mt-1 text-sm text-ivory-mute">Kill-switches and percentage rollouts. Public read; admin write.</p>
      </div>

      <form action={upsertFlag} className="card flex flex-wrap items-end gap-3 p-4">
        <div>
          <label className="block text-xs uppercase tracking-widest text-ivory-mute">Key</label>
          <input name="key" required maxLength={80} className="input" placeholder="shop.checkout" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-ivory-mute">Enabled</label>
          <select name="enabled" className="input" defaultValue="false">
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-ivory-mute">Rollout %</label>
          <input name="rollout_pct" type="number" min="0" max="100" defaultValue="0" className="input w-24" />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-xs uppercase tracking-widest text-ivory-mute">Description</label>
          <input name="description" maxLength={200} className="input w-full" />
        </div>
        <button type="submit" className="btn-primary">Save</button>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">Key</th>
              <th className="px-4 py-3">Enabled</th>
              <th className="px-4 py-3">Rollout</th>
              <th className="px-4 py-3">Description</th>
              <th className="px-4 py-3">Updated</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {flags.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ivory-mute">No flags.</td></tr>
            )}
            {flags.map((f) => (
              <tr key={f.key}>
                <td className="px-4 py-3 font-mono text-xs text-gold">{f.key}</td>
                <td className="px-4 py-3 text-xs">
                  {f.enabled ? <span className="text-emerald-400">on</span> : <span className="text-ivory-mute">off</span>}
                </td>
                <td className="px-4 py-3 tabular-nums">{f.rollout_pct}%</td>
                <td className="px-4 py-3 text-xs text-ivory-mute">{f.description ?? "—"}</td>
                <td className="px-4 py-3 text-xs text-ivory-mute">{new Date(f.updated_at).toLocaleString()}</td>
                <td className="px-4 py-3">
                  <form action={deleteFlag}>
                    <input type="hidden" name="key" value={f.key} />
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
