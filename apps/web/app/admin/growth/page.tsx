import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type AchievementRow = { code: string; awarded_at: string; user_id: string };
type PromptRow = { kind: string; shown_at: string; user_id: string };
type ChurnRow = { id: string; reason: string; note: string | null; created_at: string; user_id: string };

function aggregate<T extends { [K in keyof T]: T[K] }>(rows: T[], key: keyof T) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const k = String(r[key] ?? "");
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries())
    .map(([k, v]) => ({ key: k, count: v }))
    .sort((a, b) => b.count - a.count);
}

export default async function AdminGrowthPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string }>;
}) {
  const sp = await searchParams;
  const days = Math.max(1, Math.min(120, Number(sp.days ?? "30") || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const sb = createAdminClient();

  const [achQ, promQ, churnQ] = await Promise.all([
    sb
      .from("vcard_achievements")
      .select("code, awarded_at, user_id")
      .gte("awarded_at", since)
      .order("awarded_at", { ascending: false })
      .limit(2000),
    sb
      .from("vcard_prompts_shown")
      .select("kind, shown_at, user_id")
      .gte("shown_at", since)
      .order("shown_at", { ascending: false })
      .limit(2000),
    sb
      .from("vcard_churn_survey")
      .select("id, reason, note, created_at, user_id")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const achievements = (achQ.data as AchievementRow[] | null) ?? [];
  const prompts = (promQ.data as PromptRow[] | null) ?? [];
  const churn = (churnQ.data as ChurnRow[] | null) ?? [];

  const achByCode = aggregate(achievements, "code");
  const promptByKind = aggregate(prompts, "kind");
  const churnByReason = aggregate(churn, "reason");

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Growth</h1>
          <p className="mt-1 text-sm text-ivory-mute">
            Achievements, prompts, and churn signals — last {days} day(s).
          </p>
        </div>
        <form className="flex gap-2 text-sm">
          <input
            name="days"
            type="number"
            min={1}
            max={120}
            defaultValue={days}
            placeholder="days"
            className="input w-24"
          />
          <button className="btn-ghost" type="submit">Refresh</button>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <section className="card overflow-hidden">
          <header className="border-b border-onyx-700/60 px-4 py-3 text-xs uppercase tracking-widest text-ivory-mute">
            Achievements awarded ({achievements.length})
          </header>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
              <tr>
                <th className="px-4 py-2">Code</th>
                <th className="px-4 py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-onyx-700/60">
              {achByCode.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-6 text-center text-ivory-mute">No achievements awarded.</td></tr>
              )}
              {achByCode.map((r) => (
                <tr key={r.key}>
                  <td className="px-4 py-2 font-mono text-xs">{r.key}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card overflow-hidden">
          <header className="border-b border-onyx-700/60 px-4 py-3 text-xs uppercase tracking-widest text-ivory-mute">
            Prompts shown ({prompts.length})
          </header>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
              <tr>
                <th className="px-4 py-2">Kind</th>
                <th className="px-4 py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-onyx-700/60">
              {promptByKind.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-6 text-center text-ivory-mute">No prompts logged.</td></tr>
              )}
              {promptByKind.map((r) => (
                <tr key={r.key}>
                  <td className="px-4 py-2 font-mono text-xs">{r.key}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="card overflow-hidden">
          <header className="border-b border-onyx-700/60 px-4 py-3 text-xs uppercase tracking-widest text-ivory-mute">
            Churn reasons ({churn.length})
          </header>
          <table className="w-full text-left text-sm">
            <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
              <tr>
                <th className="px-4 py-2">Reason</th>
                <th className="px-4 py-2 text-right">Count</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-onyx-700/60">
              {churnByReason.length === 0 && (
                <tr><td colSpan={2} className="px-4 py-6 text-center text-ivory-mute">No churn surveys yet.</td></tr>
              )}
              {churnByReason.map((r) => (
                <tr key={r.key}>
                  <td className="px-4 py-2 font-mono text-xs">{r.key}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{r.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>

      <section className="card overflow-hidden">
        <header className="border-b border-onyx-700/60 px-4 py-3 text-xs uppercase tracking-widest text-ivory-mute">
          Latest churn notes
        </header>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">User</th>
              <th className="px-4 py-2">Reason</th>
              <th className="px-4 py-2">Note</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {churn.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-ivory-mute">No notes.</td></tr>
            )}
            {churn.map((r) => (
              <tr key={r.id}>
                <td className="whitespace-nowrap px-4 py-2 text-xs text-ivory-mute">{new Date(r.created_at).toLocaleString()}</td>
                <td className="px-4 py-2 font-mono text-xs text-ivory-mute">{r.user_id.slice(0, 8)}</td>
                <td className="px-4 py-2 text-xs">{r.reason}</td>
                <td className="px-4 py-2 text-xs text-ivory-mute">{r.note ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
