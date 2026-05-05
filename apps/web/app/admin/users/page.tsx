import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type Row = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  plan: string;
  verified: boolean;
  published: boolean;
  bonus_storage_bytes: number;
  created_at: string;
};

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const sp = await searchParams;
  const sb = createAdminClient();
  let q = sb
    .from("vcard_profile_ext")
    .select("user_id, username, display_name, plan, verified, published, bonus_storage_bytes, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (sp.q) q = q.ilike("username", `%${sp.q}%`);
  const { data } = await q;
  const rows = (data as Row[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Users</h1>
          <p className="mt-1 text-sm text-ivory-mute">Latest 200 by signup date.</p>
        </div>
        <form className="flex gap-2 text-sm">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="search by username" className="input" />
          <button className="btn-ghost" type="submit">Search</button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {rows.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-ivory-mute">No users.</td></tr>
            )}
            {rows.map((r) => (
              <tr key={r.user_id}>
                <td className="px-4 py-3">
                  {r.username ? (
                    <a href={`/u/${r.username}`} target="_blank" rel="noreferrer" className="text-gold hover:underline">
                      @{r.username}
                    </a>
                  ) : <span className="text-ivory-mute">—</span>}
                </td>
                <td className="px-4 py-3 text-ivory">{r.display_name ?? "—"}</td>
                <td className="px-4 py-3">
                  <span className="rounded-pill border border-onyx-700/60 px-2.5 py-0.5 text-xs">{r.plan}</span>
                </td>
                <td className="px-4 py-3 text-xs">
                  {r.verified && <span className="mr-2 text-gold">✓ verified</span>}
                  {r.published ? <span className="text-emerald-400">live</span> : <span className="text-ivory-mute">draft</span>}
                </td>
                <td className="px-4 py-3 text-xs text-ivory-mute">{new Date(r.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
