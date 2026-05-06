import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/auth";
import { usesSharedProfilesAsPrimary } from "@/lib/profiles";

export const dynamic = "force-dynamic";

const SHARED_PLAN_PRIORITY: Plan[] = ["enterprise", "team", "pro"];

type Row = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  origin_site: string | null;
  plan: string;
  verified: boolean;
  published: boolean;
  bonus_storage_bytes: number;
  created_at: string;
};

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; origin?: string }> }) {
  const sp = await searchParams;
  const sb = createAdminClient();
  const sharedPrimary = await usesSharedProfilesAsPrimary();

  let rows: Row[] = [];

  if (sharedPrimary) {
    let q = sb
      .from("profiles")
      .select("id, username, display_name, origin_site, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (sp.q) q = q.ilike("username", `%${sp.q}%`);
    if (sp.origin) q = q.ilike("origin_site", `%${sp.origin}%`);

    const { data } = await q;
    const baseRows = ((data as Array<{ id: string; username: string | null; display_name: string | null; origin_site: string | null; created_at: string | null }> | null) ?? []);
    const userIds = baseRows.map((row) => row.id);
    const [{ data: subscriptions }, { data: verifications }] = userIds.length
      ? await Promise.all([
          sb
            .from("vcard_subscriptions")
            .select("user_id, plan")
            .in("user_id", userIds)
            .in("status", ["trialing", "active", "past_due"]),
          sb
            .from("vcard_verifications")
            .select("user_id, status, submitted_at")
            .in("user_id", userIds)
            .order("submitted_at", { ascending: false }),
        ])
      : [{ data: [] }, { data: [] }];

    const planByUserId = new Map<string, Plan>();
    for (const plan of SHARED_PLAN_PRIORITY) {
      for (const row of (subscriptions as Array<{ user_id: string; plan: Plan | null }> | null) ?? []) {
        if (row.plan === plan && !planByUserId.has(row.user_id)) {
          planByUserId.set(row.user_id, plan);
        }
      }
    }

    const verificationByUserId = new Map<string, boolean>();
    for (const row of (verifications as Array<{ user_id: string; status: string | null }> | null) ?? []) {
      if (!verificationByUserId.has(row.user_id)) {
        verificationByUserId.set(row.user_id, row.status === "approved");
      }
    }

    rows = baseRows.map((row) => ({
      user_id: row.id,
      username: row.username,
      display_name: row.display_name,
      origin_site: row.origin_site,
      plan: planByUserId.get(row.id) ?? "free",
      verified: verificationByUserId.get(row.id) ?? false,
      published: !!row.username,
      bonus_storage_bytes: 0,
      created_at: row.created_at ?? new Date(0).toISOString(),
    }));
  } else {
    let q = sb
      .from("vcard_profile_ext")
      .select("user_id, username, display_name, origin_site, plan, verified, published, bonus_storage_bytes, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (sp.q) q = q.ilike("username", `%${sp.q}%`);
    const { data } = await q;
    rows = (data as Row[] | null) ?? [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Users</h1>
          <p className="mt-1 text-sm text-ivory-mute">Latest 200 by signup date.</p>
        </div>
        <form className="flex gap-2 text-sm">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="search by username" className="input" />
          <input name="origin" defaultValue={sp.origin ?? ""} placeholder="filter origin site" className="input" />
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
              <th className="px-4 py-3">Origin</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {rows.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ivory-mute">No users.</td></tr>
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
                <td className="px-4 py-3 text-xs text-ivory-mute">{r.origin_site ?? "shared/unknown"}</td>
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
