import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

type FunnelRow = { event: string; count: number; users: number };

const DEFAULT_STEPS = [
  "landing_view",
  "signup_start",
  "signup_complete",
  "onboarding_step_view",
  "onboarding_completed",
  "first_publish",
  "first_tap",
  "subscription_started",
];

export default async function AdminFunnelPage({
  searchParams,
}: {
  searchParams: Promise<{ days?: string; events?: string }>;
}) {
  const sp = await searchParams;
  const days = Math.max(1, Math.min(90, Number(sp.days ?? "14") || 14));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const stepsCsv = (sp.events ?? "").trim();
  const steps = stepsCsv ? stepsCsv.split(",").map((s) => s.trim()).filter(Boolean) : DEFAULT_STEPS;

  const sb = createAdminClient();
  const rows: FunnelRow[] = [];
  for (const event of steps) {
    const { data } = await sb
      .from("vcard_funnel_events")
      .select("user_id, anon_id")
      .eq("event", event)
      .gte("occurred_at", since)
      .limit(50_000);
    const list = (data as Array<{ user_id: string | null; anon_id: string | null }> | null) ?? [];
    const uniq = new Set(list.map((r) => r.user_id ?? r.anon_id ?? "").filter(Boolean));
    rows.push({ event, count: list.length, users: uniq.size });
  }

  const top = rows[0]?.users ?? 0;
  const formatPct = (n: number) =>
    top > 0 ? `${((n / top) * 100).toFixed(1)}%` : "—";

  // Recent events sample.
  const { data: recent } = await sb
    .from("vcard_funnel_events")
    .select("event, user_id, anon_id, props, occurred_at")
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(50);
  type Recent = {
    event: string;
    user_id: string | null;
    anon_id: string | null;
    props: unknown;
    occurred_at: string;
  };
  const recentRows = (recent as Recent[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Funnel</h1>
          <p className="mt-1 text-sm text-ivory-mute">
            Conversion across the activation funnel — last {days} day(s).
          </p>
        </div>
        <form className="flex gap-2 text-sm">
          <input
            name="days"
            type="number"
            min={1}
            max={90}
            defaultValue={days}
            placeholder="days"
            className="input w-24"
          />
          <input
            name="events"
            defaultValue={stepsCsv}
            placeholder="csv of events"
            className="input w-80"
          />
          <button className="btn-ghost" type="submit">
            Refresh
          </button>
        </form>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">Step</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3 text-right">Total fires</th>
              <th className="px-4 py-3 text-right">Unique users</th>
              <th className="px-4 py-3 text-right">% of top</th>
              <th className="px-4 py-3">Bar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {rows.map((r, i) => {
              const pct = top > 0 ? Math.round((r.users / top) * 100) : 0;
              return (
                <tr key={r.event}>
                  <td className="px-4 py-3 text-ivory-mute">{i + 1}</td>
                  <td className="px-4 py-3 font-mono text-xs">{r.event}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.count}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{r.users}</td>
                  <td className="px-4 py-3 text-right text-ivory-mute">{formatPct(r.users)}</td>
                  <td className="px-4 py-3">
                    <div className="h-2 w-full rounded-full bg-onyx-800">
                      <div
                        className="h-2 rounded-full bg-gold-grad"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <section className="card overflow-hidden">
        <header className="border-b border-onyx-700/60 px-4 py-3 text-xs uppercase tracking-widest text-ivory-mute">
          Recent events ({recentRows.length})
        </header>
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Event</th>
              <th className="px-4 py-3">Identity</th>
              <th className="px-4 py-3">Props</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {recentRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-center text-ivory-mute">
                  No events captured.
                </td>
              </tr>
            )}
            {recentRows.map((row, i) => (
              <tr key={`${row.occurred_at}-${i}`}>
                <td className="whitespace-nowrap px-4 py-3 text-xs text-ivory-mute">
                  {new Date(row.occurred_at).toLocaleString()}
                </td>
                <td className="px-4 py-3 font-mono text-xs">{row.event}</td>
                <td className="px-4 py-3 text-xs">
                  <div className="font-mono text-ivory-mute">
                    {row.user_id ? row.user_id.slice(0, 8) : row.anon_id?.slice(0, 12) ?? "anon"}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <pre className="max-w-[420px] overflow-hidden truncate text-xs text-ivory-mute">
                    {JSON.stringify(row.props ?? {})}
                  </pre>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
