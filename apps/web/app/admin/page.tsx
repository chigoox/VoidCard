import { createAdminClient } from "@/lib/supabase/admin";
import type { Plan } from "@/lib/auth";
import { formatPrice } from "@/lib/cms";
import { usesSharedProfilesAsPrimary } from "@/lib/profiles";

export const dynamic = "force-dynamic";

type Stat = { label: string; value: string; sub?: string };
const SHARED_PLAN_PRIORITY: Plan[] = ["enterprise", "team", "pro"];

async function getStats(): Promise<{
  stats: Stat[];
  recentOrders: Array<{ id: string; email: string; total_cents: number; currency: string; status: string; created_at: string }>;
  recentSignups: Array<{ id: string; username: string | null; plan: string; created_at: string }>;
}> {
  const sb = createAdminClient();
  const since30 = new Date(Date.now() - 30 * 86400_000).toISOString();
  const sharedPrimary = await usesSharedProfilesAsPrimary();

  if (sharedPrimary) {
    const [profiles, pubProfiles, orders30, paid30, subsActive, recentOrders, recentSignups] = await Promise.all([
      sb.from("profiles").select("id", { count: "exact", head: true }),
      sb.from("profiles").select("id", { count: "exact", head: true }).not("username", "is", null),
      sb.from("vcard_orders").select("id", { count: "exact", head: true }).gte("created_at", since30),
      sb.from("vcard_orders").select("total_cents").gte("created_at", since30).eq("status", "paid"),
      sb.from("vcard_subscriptions").select("plan, interval, status").eq("status", "active"),
      sb.from("vcard_orders").select("id, email, total_cents, currency, status, created_at").order("created_at", { ascending: false }).limit(10),
      sb.from("profiles").select("id, username, created_at").order("created_at", { ascending: false }).limit(10),
    ]);

    const revenue30 = (paid30.data ?? []).reduce((acc: number, r: { total_cents: number | null }) => acc + (r.total_cents ?? 0), 0);
    const subs = subsActive.data ?? [];
    const mrr = subs.reduce((acc: number, s: { plan: string; interval: string }) => {
      const monthly = s.plan === "pro" ? 499 : s.plan === "team" ? 1499 : 0;
      return acc + (s.interval === "year" ? Math.round(monthly) : monthly);
    }, 0);

    const stats: Stat[] = [
      { label: "Profiles", value: String(profiles.count ?? 0) },
      { label: "Published", value: String(pubProfiles.count ?? 0) },
      { label: "Active subs", value: String(subs.length), sub: `${formatPrice(mrr)}/mo MRR` },
      { label: "Orders 30d", value: String(orders30.count ?? 0) },
      { label: "Revenue 30d", value: formatPrice(revenue30) },
    ];

    const sharedRecentRows = ((recentSignups.data as Array<{ id: string; username: string | null; created_at: string }> | null) ?? []);
    const sharedSignupIds = sharedRecentRows.map((row) => row.id);
    const { data: sharedSignupSubs } = sharedSignupIds.length
      ? await sb
          .from("vcard_subscriptions")
          .select("user_id, plan")
          .in("user_id", sharedSignupIds)
          .in("status", ["trialing", "active", "past_due"])
      : { data: [] };

    const sharedPlanByUserId = new Map<string, Plan>();
    for (const plan of SHARED_PLAN_PRIORITY) {
      for (const row of (sharedSignupSubs as Array<{ user_id: string; plan: Plan | null }> | null) ?? []) {
        if (row.plan === plan && !sharedPlanByUserId.has(row.user_id)) {
          sharedPlanByUserId.set(row.user_id, plan);
        }
      }
    }

    return {
      stats,
      recentOrders: (recentOrders.data as Array<{ id: string; email: string; total_cents: number; currency: string; status: string; created_at: string }> | null) ?? [],
      recentSignups: sharedRecentRows.map((row) => ({
        id: row.id,
        username: row.username,
        plan: sharedPlanByUserId.get(row.id) ?? "free",
        created_at: row.created_at,
      })),
    };
  }

  const [profiles, pubProfiles, orders30, paid30, subsActive, recentOrders, recentSignups] = await Promise.all([
    sb.from("vcard_profile_ext").select("user_id", { count: "exact", head: true }),
    sb.from("vcard_profile_ext").select("user_id", { count: "exact", head: true }).eq("published", true),
    sb.from("vcard_orders").select("id", { count: "exact", head: true }).gte("created_at", since30),
    sb.from("vcard_orders").select("total_cents").gte("created_at", since30).eq("status", "paid"),
    sb.from("vcard_subscriptions").select("plan, interval, status").eq("status", "active"),
    sb.from("vcard_orders").select("id, email, total_cents, currency, status, created_at").order("created_at", { ascending: false }).limit(10),
    sb.from("vcard_profile_ext").select("user_id, username, plan, created_at").order("created_at", { ascending: false }).limit(10),
  ]);

  const revenue30 = (paid30.data ?? []).reduce((acc: number, r: { total_cents: number | null }) => acc + (r.total_cents ?? 0), 0);
  const subs = subsActive.data ?? [];
  const mrr = subs.reduce((acc: number, s: { plan: string; interval: string }) => {
    const monthly = s.plan === "pro" ? 499 : s.plan === "team" ? 1499 : 0;
    return acc + (s.interval === "year" ? Math.round(monthly) : monthly);
  }, 0);

  const stats: Stat[] = [
    { label: "Profiles", value: String(profiles.count ?? 0) },
    { label: "Published", value: String(pubProfiles.count ?? 0) },
    { label: "Active subs", value: String(subs.length), sub: `${formatPrice(mrr)}/mo MRR` },
    { label: "Orders 30d", value: String(orders30.count ?? 0) },
    { label: "Revenue 30d", value: formatPrice(revenue30) },
  ];

  return {
    stats,
    recentOrders: (recentOrders.data as Array<{ id: string; email: string; total_cents: number; currency: string; status: string; created_at: string }> | null) ?? [],
    recentSignups: ((recentSignups.data as Array<{ user_id: string; username: string | null; plan: string; created_at: string }> | null) ?? []).map((row) => ({
      id: row.user_id,
      username: row.username,
      plan: row.plan,
      created_at: row.created_at,
    })),
  };
}

export default async function AdminOverviewPage() {
  const { stats, recentOrders, recentSignups } = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl text-gold-grad">Overview</h1>
        <p className="mt-1 text-sm text-ivory-mute">Last 30 days at a glance.</p>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <p className="text-xs uppercase tracking-widest text-ivory-mute">{s.label}</p>
            <p className="mt-2 font-display text-3xl text-ivory">{s.value}</p>
            {s.sub && <p className="mt-1 text-xs text-gold">{s.sub}</p>}
          </div>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <section className="card p-5">
          <h2 className="mb-3 font-display text-xl">Recent orders</h2>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-ivory-mute">No orders yet.</p>
          ) : (
            <ul className="divide-y divide-onyx-700/60">
              {recentOrders.map((o) => (
                <li key={o.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="text-ivory">{o.email}</p>
                    <p className="text-xs text-ivory-mute">{new Date(o.created_at).toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-display text-gold-grad">{formatPrice(o.total_cents, o.currency)}</p>
                    <p className="text-xs text-ivory-mute">{o.status}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="card p-5">
          <h2 className="mb-3 font-display text-xl">Recent signups</h2>
          {recentSignups.length === 0 ? (
            <p className="text-sm text-ivory-mute">No signups yet.</p>
          ) : (
            <ul className="divide-y divide-onyx-700/60">
              {recentSignups.map((u) => (
                <li key={u.id} className="flex items-center justify-between py-2 text-sm">
                  <div>
                    <p className="text-ivory">@{u.username ?? "—"}</p>
                    <p className="text-xs text-ivory-mute">{new Date(u.created_at).toLocaleString()}</p>
                  </div>
                  <span className="rounded-pill border border-onyx-700/60 px-2.5 py-1 text-xs">{u.plan}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
