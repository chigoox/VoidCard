import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function InsightsPage() {
  const u = await requireUser();
  const sb = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: taps } = await sb
    .from("vcard_taps")
    .select("source, occurred_at, country")
    .eq("user_id", u.id)
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(1000);

  const total = (taps ?? []).length;
  const byCountry = (taps ?? []).reduce<Record<string, number>>((a, t) => {
    const k = t.country ?? "—"; a[k] = (a[k] ?? 0) + 1; return a;
  }, {});
  const top = Object.entries(byCountry).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl text-gold-grad">Insights · 30 days</h1>
      <div className="card p-6">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">Total taps</p>
        <p data-testid="taps-total" className="mt-2 font-display text-5xl text-gold-grad">{total.toLocaleString()}</p>
      </div>
      <div className="card p-6">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">Top regions</p>
        <ul className="mt-3 space-y-1 text-sm">
          {top.length === 0 && <li className="text-ivory-dim">No data yet — share your card.</li>}
          {top.map(([c, n]) => (
            <li key={c} className="flex justify-between"><span>{c}</span><span className="text-gold">{n}</span></li>
          ))}
        </ul>
      </div>
    </div>
  );
}
