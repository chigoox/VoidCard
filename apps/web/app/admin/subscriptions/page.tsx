import { createAdminClient } from "@/lib/supabase/admin";
import { formatPrice } from "@/lib/cms";

export const dynamic = "force-dynamic";

type Sub = {
  id: string;
  user_id: string;
  plan: string;
  interval: string;
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  seats: number;
  created_at: string;
};

export default async function AdminSubscriptionsPage() {
  const sb = createAdminClient();
  const { data } = await sb
    .from("vcard_subscriptions")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  const subs = (data as Sub[] | null) ?? [];
  const mrr = subs
    .filter((s) => s.status === "active")
    .reduce((acc, s) => acc + (s.plan === "pro" ? 499 : s.plan === "team" ? 1499 : 0) * s.seats, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-gold-grad">Subscriptions</h1>
        <p className="mt-1 text-sm text-ivory-mute">
          Active MRR: <span className="text-gold">{formatPrice(mrr)}/mo</span>
        </p>
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">Plan</th>
              <th className="px-4 py-3">Interval</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Seats</th>
              <th className="px-4 py-3">Renews</th>
              <th className="px-4 py-3">Cancel?</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {subs.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ivory-mute">No subscriptions yet.</td></tr>
            )}
            {subs.map((s) => (
              <tr key={s.id}>
                <td className="px-4 py-3 text-ivory">{s.plan}</td>
                <td className="px-4 py-3">{s.interval}</td>
                <td className="px-4 py-3">
                  <span className="rounded-pill border border-onyx-700/60 px-2.5 py-0.5 text-xs">{s.status}</span>
                </td>
                <td className="px-4 py-3">{s.seats}</td>
                <td className="px-4 py-3 text-xs text-ivory-mute">
                  {s.current_period_end ? new Date(s.current_period_end).toLocaleDateString() : "—"}
                </td>
                <td className="px-4 py-3 text-xs">
                  {s.cancel_at_period_end ? <span className="text-amber-400">canceling</span> : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
