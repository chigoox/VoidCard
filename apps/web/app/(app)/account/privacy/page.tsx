import { requireUser } from "@/lib/auth";
import { loadPrimaryProfile, usesSharedProfilesAsPrimary } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import {
  exportDataAction,
  deleteAccountAction,
  cancelDeletionAction,
  updateAiIndexingAction,
} from "./actions";

export const metadata = { title: "Privacy & data · VoidCard" };

type DsrRow = {
  id: string;
  kind: string;
  status: string;
  url: string | null;
  url_expires_at: string | null;
  delete_at: string | null;
  created_at: string;
};

const AI_OPTIONS: Array<{
  value: "allow_search_only" | "allow_all" | "disallow_all";
  title: string;
  body: string;
}> = [
  {
    value: "allow_search_only",
    title: "Allow search engines only (default)",
    body: "Google, Bing, DuckDuckGo, and similar search crawlers may index your profile. AI training crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended, etc.) are blocked.",
  },
  {
    value: "allow_all",
    title: "Allow everything, including AI training",
    body: "Maximum reach. Both search engines and AI training crawlers may use your public profile. Your profile data is also exposed via /u/<handle>/data.json with a permissive header.",
  },
  {
    value: "disallow_all",
    title: "Block everything",
    body: "Profile is excluded from search engines and all AI crawlers. /u/<handle>/data.json returns 403. People you share your profile with directly will still see it.",
  },
];

export default async function PrivacyPage() {
  const u = await requireUser();
  const sb = await createClient();
  const sharedPrimary = await usesSharedProfilesAsPrimary();
  const { data } = await sb
    .from("vcard_dsr_log")
    .select("id, kind, status, url, url_expires_at, delete_at, created_at")
    .eq("user_id", u.id)
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = (data ?? []) as DsrRow[];
  const pendingDelete = rows.find((r) => r.kind === "delete" && r.status === "queued");

  const profile = await loadPrimaryProfile(u.id);
  const currentAi = (profile?.aiIndexing as
    | "allow_search_only"
    | "allow_all"
    | "disallow_all"
    | undefined) ?? "allow_search_only";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-display text-2xl text-gold-grad">Privacy & data</h1>
        <p className="mt-1 text-sm text-ivory-mute">
          Export everything we hold about you, or request permanent deletion. Both are processed under GDPR Art. 15 / 17.
        </p>
      </header>

      <section className="card p-6 space-y-3">
        <h2 className="font-display text-lg">AI &amp; search visibility</h2>
        <p className="text-sm text-ivory-mute">
          Control which automated crawlers may read your public profile. Changes apply within minutes via robots.txt and per-page headers.
        </p>
        {sharedPrimary && (
          <p className="text-xs text-ivory-mute">
            AI indexing controls are read-only while this deployment is using shared-profile compatibility mode.
          </p>
        )}
        <form action={updateAiIndexingAction} className="space-y-3">
          {AI_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-start gap-3 rounded-card border border-ivory-mute/20 p-4 hover:border-gold/40"
            >
              <input
                type="radio"
                name="ai_indexing"
                value={opt.value}
                defaultChecked={currentAi === opt.value}
                disabled={sharedPrimary}
                className="mt-1 accent-gold"
              />
              <div>
                <p className="font-medium text-ivory">{opt.title}</p>
                <p className="mt-1 text-sm text-ivory-mute">{opt.body}</p>
              </div>
            </label>
          ))}
          <button type="submit" className="btn-gold" disabled={sharedPrimary}>Save</button>
        </form>
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="font-display text-lg">Export your data</h2>
        <p className="text-sm text-ivory-mute">
          You&apos;ll get an email with a signed link to a ZIP of all profile, card, shop, and analytics rows tied to your account. Link is valid for 7 days. Limit: 1 / 24h.
        </p>
        <form action={exportDataAction}>
          <button type="submit" className="btn-gold">Request export</button>
        </form>
      </section>

      <section className="card p-6 space-y-3 border-red-900/40">
        <h2 className="font-display text-lg text-red-300">Delete account</h2>
        {pendingDelete ? (
          <>
            <p className="text-sm text-ivory-mute">
              Deletion is scheduled for <strong>{pendingDelete.delete_at}</strong>. You can cancel any time before then.
            </p>
            <form action={cancelDeletionAction}>
              <button type="submit" className="btn-secondary">Cancel deletion</button>
            </form>
          </>
        ) : (
          <>
            <p className="text-sm text-ivory-mute">
              We&apos;ll soft-delete after a 30-day grace window, then permanently erase. Type <code>DELETE</code> to confirm.
            </p>
            <form action={deleteAccountAction} className="flex gap-2">
              <input
                name="confirm"
                placeholder="DELETE"
                className="input flex-1"
                aria-label="Type DELETE to confirm"
                required
              />
              <button type="submit" className="btn-danger">Request deletion</button>
            </form>
          </>
        )}
      </section>

      <section className="card p-6 space-y-3">
        <h2 className="font-display text-lg">Recent data requests</h2>
        {rows.length === 0 ? (
          <p className="text-sm text-ivory-mute">No requests yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {rows.map((r) => (
              <li key={r.id} className="flex justify-between border-b border-ivory-mute/10 py-2">
                <span className="font-mono text-xs text-ivory-mute">{r.created_at.slice(0, 19).replace("T", " ")}</span>
                <span className="uppercase tracking-wide text-ivory-dim">{r.kind}</span>
                <span className="text-gold">{r.status}</span>
                {r.url ? (
                  <a href={r.url} className="text-gold underline">download</a>
                ) : (
                  <span className="text-ivory-mute">—</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
