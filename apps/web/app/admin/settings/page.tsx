import { createAdminClient } from "@/lib/supabase/admin";
import { upsertSetting, deleteSetting } from "./actions";

export const dynamic = "force-dynamic";

type Row = { key: string; value: unknown; updated_at: string };

export default async function AdminSettingsPage() {
  const sb = createAdminClient();
  const { data } = await sb.from("vcard_settings").select("*").order("key", { ascending: true });
  const rows = (data as Row[] | null) ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-gold-grad">Site settings</h1>
        <p className="mt-1 text-sm text-ivory-mute">
          Key/value config used by the app. Values are JSON.
        </p>
      </div>

      <form action={upsertSetting} className="card grid gap-3 p-5 md:grid-cols-3">
        <input name="key" required placeholder="key (e.g. flags.signup_enabled)" className="input" />
        <input name="value_json" required placeholder='value JSON (e.g. true or "hello" or {"x":1})' className="input md:col-span-1 font-mono" />
        <button className="btn-gold" type="submit">Add / update</button>
      </form>

      <div className="space-y-3">
        {rows.length === 0 && <p className="text-sm text-ivory-mute">No settings yet.</p>}
        {rows.map((r) => (
          <form key={r.key} action={upsertSetting} className="card flex flex-wrap items-center gap-3 p-4">
            <input type="hidden" name="key" value={r.key} />
            <code className="rounded-pill border border-onyx-700/60 px-2.5 py-1 text-xs text-gold">{r.key}</code>
            <input
              name="value_json"
              defaultValue={JSON.stringify(r.value)}
              className="input flex-1 font-mono text-xs"
            />
            <span className="text-xs text-ivory-mute">{new Date(r.updated_at).toLocaleString()}</span>
            <button type="submit" className="btn-ghost">Save</button>
          </form>
        ))}
      </div>

      {rows.length > 0 && (
        <details className="card p-4 text-sm">
          <summary className="cursor-pointer text-ivory-dim">Delete a setting</summary>
          <form action={deleteSetting} className="mt-3 flex gap-3">
            <input name="key" required placeholder="key to delete" className="input" />
            <button type="submit" className="text-rose-400 hover:underline">Delete</button>
          </form>
        </details>
      )}
    </div>
  );
}
