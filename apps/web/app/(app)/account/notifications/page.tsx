import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { saveWeeklyDigestPreference } from "./actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const u = await requireUser();
  const ent = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });
  const sb = await createClient();
  const [{ data: notes }, { data: prefs }] = await Promise.all([
    sb
      .from("vcard_notifications")
      .select("id, kind, title, body, created_at, read_at")
      .eq("user_id", u.id)
      .order("created_at", { ascending: false })
      .limit(50),
    sb
      .from("vcard_profile_ext")
      .select("weekly_digest_enabled, last_weekly_digest_at")
      .eq("user_id", u.id)
      .maybeSingle(),
  ]);

  const weeklyDigestEnabled = prefs?.weekly_digest_enabled ?? true;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl text-gold-grad">Notifications</h1>
      </header>
      <section className="card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Weekly digest</p>
            <p className="mt-1 text-sm text-ivory-dim">
              {ent.weeklyDigest
                ? "A Monday summary of taps, contacts, and orders sent to your account email."
                : "Weekly digest is available on Pro and Team."}
            </p>
            {prefs?.last_weekly_digest_at && (
              <p className="mt-1 text-xs text-ivory-mute">
                Last sent {new Date(prefs.last_weekly_digest_at).toLocaleString()}.
              </p>
            )}
          </div>
          {ent.weeklyDigest ? (
            <form action={saveWeeklyDigestPreference}>
              <input type="hidden" name="enabled" value={weeklyDigestEnabled ? "false" : "true"} />
              <button className={weeklyDigestEnabled ? "btn-ghost" : "btn-gold"} type="submit" data-testid="weekly-digest-toggle">
                {weeklyDigestEnabled ? "Disable digest" : "Enable digest"}
              </button>
            </form>
          ) : (
            <Link href="/pricing" className="btn-gold inline-flex">
              Upgrade to Pro
            </Link>
          )}
        </div>
      </section>
      <ul className="space-y-2">
        {(notes ?? []).map((n) => (
          <li key={n.id} className="card p-4">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-base">{n.title}</p>
              <span className="text-xs text-ivory-mute">{new Date(n.created_at).toLocaleDateString()}</span>
            </div>
            {n.body && <p className="mt-1 text-sm text-ivory-dim">{n.body}</p>}
          </li>
        ))}
        {(notes ?? []).length === 0 && (
          <p className="text-sm text-ivory-dim">All caught up. We&apos;ll ping you when someone taps your card.</p>
        )}
      </ul>
    </div>
  );
}
