import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/auth";
import { usesSharedProfilesAsPrimary } from "@/lib/profiles";
import { setUserRole, setUserVerified } from "./actions";

export const dynamic = "force-dynamic";

const SHARED_PLAN_PRIORITY: Plan[] = ["enterprise", "team", "pro"];

type Row = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  origin_site: string | null;
  plan: string;
  verified: boolean;
  role: "user" | "admin" | "superadmin";
  published: boolean;
  bonus_storage_bytes: number;
  created_at: string;
};

function RolePill({ role }: { role: Row["role"] }) {
  const tone = role === "superadmin"
    ? "border-rose-400/30 text-rose-300"
    : role === "admin"
      ? "border-gold/40 text-gold"
      : "border-onyx-700/60 text-ivory-mute";

  return <span className={`rounded-pill border px-2.5 py-0.5 text-xs ${tone}`}>{role}</span>;
}

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string; origin?: string }> }) {
  const adminUser = await requireAdmin();
  const sp = await searchParams;
  const sb = createAdminClient();
  const sharedPrimary = await usesSharedProfilesAsPrimary();
  const canManageRoles = adminUser.role === "superadmin";

  let rows: Row[] = [];

  if (sharedPrimary) {
    let q = sb
      .from("profiles")
      .select("id, username, display_name, role, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (sp.q) q = q.ilike("username", `%${sp.q}%`);

    const { data } = await q;
    const baseRows = ((data as Array<{ id: string; username: string | null; display_name: string | null; role: Row["role"] | null; created_at: string | null }> | null) ?? []);
    const userIds = baseRows.map((row) => row.id);
    const [{ data: subscriptions }, { data: verifications }, companionResult] = userIds.length
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
          sb
            .from("vcard_profile_ext")
            .select("user_id, origin_site")
            .in("user_id", userIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [], error: null }];

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

    const originByUserId = new Map<string, string>();
    if (!companionResult.error) {
      for (const row of (companionResult.data as Array<{ user_id: string; origin_site: string | null }> | null) ?? []) {
        if (row.origin_site && !originByUserId.has(row.user_id)) {
          originByUserId.set(row.user_id, row.origin_site);
        }
      }
    }

    rows = baseRows.map((row) => ({
      user_id: row.id,
      username: row.username,
      display_name: row.display_name,
      origin_site: originByUserId.get(row.id) ?? null,
      plan: planByUserId.get(row.id) ?? "free",
      verified: verificationByUserId.get(row.id) ?? false,
      role: row.role ?? "user",
      published: !!row.username,
      bonus_storage_bytes: 0,
      created_at: row.created_at ?? new Date(0).toISOString(),
    }));

    if (sp.origin) {
      const normalizedOrigin = sp.origin.toLowerCase();
      rows = rows.filter((row) => (row.origin_site ?? "").toLowerCase().includes(normalizedOrigin));
    }
  } else {
    let q = sb
      .from("vcard_profile_ext")
      .select("user_id, username, display_name, origin_site, plan, verified, published, bonus_storage_bytes, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (sp.q) q = q.ilike("username", `%${sp.q}%`);
    const { data } = await q;
    rows = ((data as Array<Omit<Row, "role">> | null) ?? []).map((row) => ({ ...row, role: "user" }));

    const userIds = rows.map((row) => row.user_id);
    if (userIds.length > 0) {
      const { data: roles } = await sb.from("profiles").select("id, role").in("id", userIds);
      const roleByUserId = new Map(
        ((roles as Array<{ id: string; role: Row["role"] | null }> | null) ?? []).map((row) => [row.id, row.role ?? "user"]),
      );
      rows = rows.map((row) => ({ ...row, role: roleByUserId.get(row.user_id) ?? "user" }));
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Users</h1>
          <p className="mt-1 text-sm text-ivory-mute">Latest 200 by signup date.</p>
        </div>
        <form className="flex flex-wrap gap-2 text-sm">
          <input name="q" defaultValue={sp.q ?? ""} placeholder="search by username" className="input" />
          <input name="origin" defaultValue={sp.origin ?? ""} placeholder="filter origin site" className="input" />
          <button className="btn-ghost" type="submit">Search</button>
        </form>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.length === 0 && (
          <div className="card px-4 py-8 text-center text-sm text-ivory-mute">No users.</div>
        )}
        {rows.map((r) => (
          <div key={r.user_id} className="card space-y-4 p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {r.username ? (
                  <a href={`/u/${r.username}`} target="_blank" rel="noreferrer" className="block truncate text-sm text-gold hover:underline">
                    @{r.username}
                  </a>
                ) : (
                  <span className="block text-sm text-ivory-mute">No username</span>
                )}
                <p className="mt-1 truncate text-sm text-ivory">{r.display_name ?? "-"}</p>
              </div>
              <RolePill role={r.role} />
            </div>

            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[11px] uppercase tracking-widest text-ivory-mute">Plan</dt>
                <dd className="mt-1 text-ivory">{r.plan}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-widest text-ivory-mute">Joined</dt>
                <dd className="mt-1 text-ivory-mute">{new Date(r.created_at).toLocaleDateString()}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-widest text-ivory-mute">Origin</dt>
                <dd className="mt-1 text-ivory-mute">{r.origin_site ?? "shared/unknown"}</dd>
              </div>
              <div>
                <dt className="text-[11px] uppercase tracking-widest text-ivory-mute">Status</dt>
                <dd className="mt-1 text-xs">
                  {r.verified && <span className="mr-2 text-gold">✓ verified</span>}
                  {r.published ? <span className="text-emerald-400">live</span> : <span className="text-ivory-mute">draft</span>}
                </dd>
              </div>
            </dl>

            <div className="flex flex-wrap gap-2 border-t border-onyx-800 pt-3">
              <Link
                href={`/admin/users/${r.user_id}`}
                className="btn-ghost px-3 py-2 text-xs"
                data-testid={`user-open-${r.user_id}`}
              >
                Open admin page
              </Link>
              {r.username ? (
                <Link
                  href={`/u/${r.username}`}
                  target="_blank"
                  className="btn-ghost px-3 py-2 text-xs"
                >
                  Open live page
                </Link>
              ) : null}
            </div>

            <div className="space-y-3 border-t border-onyx-800 pt-3">
              <form action={setUserVerified} className="flex items-center justify-between gap-3">
                <input type="hidden" name="user_id" value={r.user_id} />
                <input type="hidden" name="verified" value={r.verified ? "false" : "true"} />
                <span className="text-xs text-ivory-mute">Verified badge</span>
                <button
                  type="submit"
                  className="btn-ghost px-3 py-2 text-xs"
                >
                  {r.verified ? "Remove badge" : "Mark verified"}
                </button>
              </form>

              {canManageRoles && (
                <form action={setUserRole} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="user_id" value={r.user_id} />
                  <div className="flex-1 min-w-[150px]">
                    <label className="block text-[11px] uppercase tracking-widest text-ivory-mute">Role</label>
                    <select
                      name="role"
                      defaultValue={r.role}
                      className="input mt-1"
                      disabled={r.user_id === adminUser.id}
                    >
                      <option value="user">user</option>
                      <option value="admin">admin</option>
                      <option value="superadmin">superadmin</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="btn-gold px-3 py-2 text-xs"
                    disabled={r.user_id === adminUser.id}
                  >
                    Save role
                  </button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="hidden card overflow-hidden md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Origin</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Joined</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {rows.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-8 text-center text-ivory-mute">No users.</td></tr>
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
                <td className="px-4 py-3"><RolePill role={r.role} /></td>
                <td className="px-4 py-3 text-xs text-ivory-mute">{r.origin_site ?? "shared/unknown"}</td>
                <td className="px-4 py-3 text-xs">
                  {r.verified && <span className="mr-2 text-gold">✓ verified</span>}
                  {r.published ? <span className="text-emerald-400">live</span> : <span className="text-ivory-mute">draft</span>}
                </td>
                <td className="px-4 py-3 text-xs text-ivory-mute">{new Date(r.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <Link
                      href={`/admin/users/${r.user_id}`}
                      className="btn-ghost px-3 py-2 text-xs"
                      data-testid={`user-open-${r.user_id}`}
                    >
                      Open
                    </Link>
                    <form action={setUserVerified}>
                      <input type="hidden" name="user_id" value={r.user_id} />
                      <input type="hidden" name="verified" value={r.verified ? "false" : "true"} />
                      <button
                        type="submit"
                        className="btn-ghost px-3 py-2 text-xs"
                        data-testid={`user-verified-toggle-${r.user_id}`}
                      >
                        {r.verified ? "Remove badge" : "Mark verified"}
                      </button>
                    </form>
                    {canManageRoles && (
                      <form action={setUserRole} className="flex flex-wrap items-center gap-2">
                        <input type="hidden" name="user_id" value={r.user_id} />
                        <select
                          name="role"
                          defaultValue={r.role}
                          className="input w-32"
                          disabled={r.user_id === adminUser.id}
                          data-testid={`user-role-select-${r.user_id}`}
                        >
                          <option value="user">user</option>
                          <option value="admin">admin</option>
                          <option value="superadmin">superadmin</option>
                        </select>
                        <button
                          type="submit"
                          className="btn-gold px-3 py-2 text-xs"
                          disabled={r.user_id === adminUser.id}
                          data-testid={`user-role-save-${r.user_id}`}
                        >
                          Save role
                        </button>
                      </form>
                    )}
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
