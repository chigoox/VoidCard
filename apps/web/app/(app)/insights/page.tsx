import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

type TapRow = {
  source: string | null;
  occurred_at: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  referrer: string | null;
};

export default async function InsightsPage() {
  const u = await requireUser();
  const sb = await createClient();
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: taps } = await sb
    .from("vcard_taps")
    .select("source, occurred_at, country, region, city, referrer")
    .eq("user_id", u.id)
    .gte("occurred_at", since)
    .order("occurred_at", { ascending: false })
    .limit(1000);

  const rows = ((taps ?? []) as TapRow[]).filter((tap) => !!tap.occurred_at);
  const total = rows.length;
  const now = Date.now();
  const today = rows.filter((tap) => isWithinDays(tap.occurred_at, now, 1)).length;
  const last7 = rows.filter((tap) => isWithinDays(tap.occurred_at, now, 7)).length;
  const bySource = topEntries(countBy(rows, (tap) => sourceLabel(tap.source)), 6);
  const topRegions = topEntries(countBy(rows, regionLabel), 6);
  const referrers = topEntries(countBy(rows, referrerLabel), 5).filter(([label]) => label !== "Direct / unknown");
  const daily = lastDays(14).map((day) => ({ ...day, value: rows.filter((tap) => tap.occurred_at?.slice(0, 10) === day.key).length }));
  const maxDaily = Math.max(...daily.map((day) => day.value), 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl text-gold-grad">Insights · 30 days</h1>
          <p className="mt-1 text-sm text-ivory-dim">Tap volume, traffic sources, regions, and referrers from your public profile, cards, embeds, and shortlinks.</p>
        </div>
        <p className="rounded-pill border border-onyx-700 px-3 py-1 text-xs uppercase tracking-widest text-ivory-mute">Last {rows.length.toLocaleString()} events</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Total taps" value={total} testId="taps-total" />
        <MetricCard label="Today" value={today} />
        <MetricCard label="Last 7 days" value={last7} />
      </div>

      <section className="card space-y-4 p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Daily activity</p>
          <p className="text-xs text-ivory-dim">Last 14 days</p>
        </div>
        <div className="flex h-40 items-end gap-1.5" aria-label="Daily taps chart">
          {daily.map((day) => (
            <div key={day.key} className="flex min-w-0 flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-t bg-gold/80" style={{ height: `${Math.max(6, (day.value / maxDaily) * 128)}px` }} title={`${day.label}: ${day.value}`} />
              <span className="max-w-full truncate text-[10px] text-ivory-dim">{day.label}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <BarList title="Top regions" empty="No region data yet. New taps now collect country, region, and city when the host provides it." rows={topRegions} />
        <BarList title="Traffic sources" empty="No source data yet." rows={bySource} />
        <BarList title="Top referrers" empty="No referrers yet." rows={referrers} />
        <section className="card p-6">
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Recent taps</p>
          <ul className="mt-4 space-y-2 text-sm">
            {rows.slice(0, 8).map((tap, index) => (
              <li key={`${tap.occurred_at}-${index}`} className="flex items-center justify-between gap-3 rounded-card border border-onyx-800 px-3 py-2">
                <span className="min-w-0 truncate text-ivory">{sourceLabel(tap.source)} · {regionLabel(tap)}</span>
                <span className="shrink-0 text-xs text-ivory-dim">{tap.occurred_at ? new Date(tap.occurred_at).toLocaleDateString() : ""}</span>
              </li>
            ))}
            {rows.length === 0 ? <li className="text-ivory-dim">No data yet. Share your card or open your public profile.</li> : null}
          </ul>
        </section>
      </div>
    </div>
  );
}

function MetricCard({ label, value, testId }: { label: string; value: number; testId?: string }) {
  return (
    <div className="card p-6">
      <p className="text-xs uppercase tracking-widest text-ivory-mute">{label}</p>
      <p data-testid={testId} className="mt-2 font-display text-4xl text-gold-grad">{value.toLocaleString()}</p>
    </div>
  );
}

function BarList({ title, rows, empty }: { title: string; rows: Array<[string, number]>; empty: string }) {
  const max = Math.max(...rows.map(([, value]) => value), 1);
  return (
    <section className="card p-6">
      <p className="text-xs uppercase tracking-widest text-ivory-mute">{title}</p>
      <ul className="mt-4 space-y-3 text-sm">
        {rows.length === 0 ? <li className="text-ivory-dim">{empty}</li> : null}
        {rows.map(([label, value]) => (
          <li key={label} className="space-y-1.5">
            <div className="flex justify-between gap-3">
              <span className="min-w-0 truncate text-ivory">{label}</span>
              <span className="shrink-0 text-gold">{value.toLocaleString()}</span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-onyx-800">
              <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(8, (value / max) * 100)}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function countBy(rows: TapRow[], keyFor: (tap: TapRow) => string) {
  return rows.reduce<Record<string, number>>((acc, tap) => {
    const key = keyFor(tap);
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
}

function topEntries(counts: Record<string, number>, limit: number) {
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function regionLabel(tap: TapRow) {
  const parts = [tap.city, tap.region, tap.country].map((part) => part?.trim()).filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Unknown region";
}

function sourceLabel(source: string | null) {
  switch ((source ?? "").toLowerCase()) {
    case "link":
      return "Profile view";
    case "qr":
      return "QR scan";
    case "nfc":
      return "NFC tap";
    case "embed":
      return "Embed";
    case "share":
      return "Share";
    case "boox-book":
      return "Boox booking";
    case "boox-cancel":
      return "Boox cancellation";
    default:
      return source || "Unknown";
  }
}

function referrerLabel(tap: TapRow) {
  if (!tap.referrer) return "Direct / unknown";
  try {
    return new URL(tap.referrer).hostname.replace(/^www\./, "");
  } catch {
    return tap.referrer.slice(0, 80);
  }
}

function isWithinDays(value: string | null, now: number, days: number) {
  if (!value) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && now - time <= days * 86_400_000;
}

function lastDays(days: number) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (days - index - 1));
    return {
      key: date.toISOString().slice(0, 10),
      label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    };
  });
}
