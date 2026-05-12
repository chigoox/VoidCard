import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { usesSharedProfilesAsPrimary } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { saveWeeklyDigestPreference } from "./actions";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const u = await requireUser();
  const ent = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });
  const sb = await createClient();
  const sharedPrimary = await usesSharedProfilesAsPrimary();
  const [{ data: notes }, prefsResult] = await Promise.all([
    sb
      .from("vcard_notifications")
      .select("id, kind, title, body, created_at, read_at")
      .eq("user_id", u.id)
      .order("created_at", { ascending: false })
      .limit(50),
    sharedPrimary
      ? Promise.resolve({ data: null })
      : sb
          .from("vcard_profile_ext")
          .select("weekly_digest_enabled, last_weekly_digest_at")
          .eq("user_id", u.id)
          .maybeSingle(),
  ]);
  const prefs = prefsResult.data;

  const weeklyDigestEnabled = prefs?.weekly_digest_enabled ?? true;

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-2xl text-gold-grad">Notifications</h1>
        <p className="mt-1 text-sm text-ivory-dim">This is where taps become momentum: profile activity, contact saves, orders, and weekly summaries.</p>
      </header>
      <section className="grid gap-3 md:grid-cols-3">
        <Link href="/share" className="card p-4 transition hover:border-gold/40">
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Next best action</p>
          <p className="mt-1 font-display text-lg text-ivory">Share your QR</p>
          <p className="mt-1 text-xs text-ivory-dim">More scans means more signal in this feed.</p>
        </Link>
        <Link href="/cards" className="card p-4 transition hover:border-gold/40">
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Hardware loop</p>
          <p className="mt-1 font-display text-lg text-ivory">Track card taps</p>
          <p className="mt-1 text-xs text-ivory-dim">See which cards are creating real meetings.</p>
        </Link>
        <Link href="/insights" className="card p-4 transition hover:border-gold/40">
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Retention loop</p>
          <p className="mt-1 font-display text-lg text-ivory">Review insights</p>
          <p className="mt-1 text-xs text-ivory-dim">Turn visits into better links and better follow-up.</p>
        </Link>
      </section>
      <section className="card p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Weekly digest</p>
            <p className="mt-1 text-sm text-ivory-dim">
              {ent.weeklyDigest
                ? "A Monday summary of taps, contacts, and orders sent to your account email."
                : "Weekly digest is available on Pro and Team."}
            </p>
            {sharedPrimary && ent.weeklyDigest && (
              <p className="mt-1 text-xs text-ivory-mute">
                Digest preference toggles are unavailable while this deployment is using shared-profile compatibility mode.
              </p>
            )}
            {prefs?.last_weekly_digest_at && (
              <p className="mt-1 text-xs text-ivory-mute">
                Last sent {new Date(prefs.last_weekly_digest_at).toLocaleString()}.
              </p>
            )}
          </div>
          {ent.weeklyDigest && !sharedPrimary ? (
            <form action={saveWeeklyDigestPreference}>
              <input type="hidden" name="enabled" value={weeklyDigestEnabled ? "false" : "true"} />
              <button className={weeklyDigestEnabled ? "btn-ghost" : "btn-gold"} type="submit" data-testid="weekly-digest-toggle">
                {weeklyDigestEnabled ? "Disable digest" : "Enable digest"}
              </button>
            </form>
          ) : ent.weeklyDigest ? (
            <span className="rounded-pill border border-onyx-700/60 px-3 py-2 text-xs text-ivory-mute">Always on</span>
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
          <div className="card border-dashed p-5 text-sm text-ivory-dim">
            <p className="font-display text-lg text-ivory">No activity yet.</p>
            <p className="mt-1">Share your profile or pair a card, then this feed becomes your tap history and follow-up prompt.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href="/share" className="btn-gold">Share profile</Link>
              <Link href="/shop" className="btn-ghost">Get a card</Link>
            </div>
          </div>
        )}
      </ul>
    </div>
  );
}
