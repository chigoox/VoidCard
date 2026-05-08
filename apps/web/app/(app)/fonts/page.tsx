import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { GOOGLE_FONT_FAMILIES, googleFontUrl } from "@/lib/fonts/google";
import { usesSharedProfilesAsPrimary } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { deleteFont, saveGoogleFont, setActiveFont } from "./actions";
import FontUploadClient from "./FontUploadClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Font = {
  id: string;
  family: string;
  weight: number;
  style: string;
  url: string;
  bytes: number;
  created_at: string;
};

export default async function FontsPage() {
  const u = await requireUser();
  const ents = entitlementsFor(u.plan);
  const sharedPrimary = await usesSharedProfilesAsPrimary();

  if (!ents.customFontUpload) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <h1 className="font-display text-3xl text-gold-grad">Custom fonts</h1>
          <Link href="/edit" className="btn-ghost px-3 py-2 text-xs">Back to editor</Link>
        </div>
        <div className="card p-6">
          <p className="text-sm text-ivory-mute">Custom font upload is a Pro feature.</p>
          <Link href="/pricing" className="btn-primary mt-4 inline-block">Upgrade to Pro</Link>
        </div>
      </div>
    );
  }

  const sb = await createClient();
  const { data: profile } = await sb
    .from("vcard_profile_ext")
    .select("custom_font_url")
    .eq("user_id", u.id)
    .maybeSingle();
  const { data } = await sb
    .from("vcard_user_fonts")
    .select("id, family, weight, style, url, bytes, created_at")
    .eq("user_id", u.id)
    .order("created_at", { ascending: false });
  const fonts = (data as Font[] | null) ?? [];
  const activeUrl = profile?.custom_font_url ?? null;

  const totalBytes = fonts.reduce((s, f) => s + f.bytes, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl text-gold-grad">Custom fonts</h1>
          <p className="mt-1 text-sm text-ivory-mute">
            Save a Google Font or upload .woff2 files. {fonts.length} fonts · {(totalBytes / 1024).toFixed(0)} KB total.
          </p>
        </div>
        <Link href="/edit" className="btn-ghost px-3 py-2 text-xs">Back to editor</Link>
      </div>

      <section className="card space-y-3 p-4">
        <div>
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Google Fonts</p>
          <p className="mt-1 text-sm text-ivory-dim">Pick a hosted font and make it active on your public profile.</p>
        </div>
        <div className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-4">
          {GOOGLE_FONT_FAMILIES.map((family) => {
            const url = googleFontUrl(family);
            const active = activeUrl === url;
            return (
              <form key={family} action={saveGoogleFont} className={["rounded-card border p-3", active ? "border-gold bg-gold/10" : "border-onyx-700 bg-onyx-950/50"].join(" ")}>
                <input type="hidden" name="family" value={family} />
                <p className="truncate text-base text-ivory" style={{ fontFamily: family }}>{family}</p>
                <button type="submit" className={active ? "mt-3 text-xs text-emerald-300" : "mt-3 text-xs text-gold hover:underline"} disabled={active}>
                  {active ? "Active" : "Save and use"}
                </button>
              </form>
            );
          })}
        </div>
      </section>

      {sharedPrimary ? (
        <div className="card p-4 text-sm text-ivory-mute">Direct .woff2 uploads are temporarily unavailable in shared-profile compatibility mode. Google Fonts above still work.</div>
      ) : (
        <FontUploadClient />
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">Family</th>
              <th className="px-4 py-3">Weight</th>
              <th className="px-4 py-3">Style</th>
              <th className="px-4 py-3">Size</th>
              <th className="px-4 py-3">Added</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {fonts.length === 0 && (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-ivory-mute">No fonts yet.</td></tr>
            )}
            {fonts.map((f) => (
              <tr key={f.id} data-testid={`font-row-${f.id}`}>
                <td className="px-4 py-3">{f.family}</td>
                <td className="px-4 py-3 tabular-nums">{f.weight}</td>
                <td className="px-4 py-3 text-xs">{f.style}</td>
                <td className="px-4 py-3 text-xs text-ivory-mute">{f.bytes ? `${(f.bytes / 1024).toFixed(0)} KB` : "Google"}</td>
                <td className="px-4 py-3 text-xs text-ivory-mute">{new Date(f.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-3 text-xs">
                    {f.url === activeUrl ? (
                      <span className="text-emerald-400" data-testid={`font-active-${f.id}`}>active</span>
                    ) : (
                      <form action={setActiveFont}>
                        <input type="hidden" name="id" value={f.id} />
                        <button className="text-gold hover:underline" type="submit" data-testid={`font-activate-${f.id}`}>use</button>
                      </form>
                    )}
                    <form action={deleteFont}>
                      <input type="hidden" name="id" value={f.id} />
                      <button className="text-red-400 hover:underline" type="submit" data-testid={`font-delete-${f.id}`}>delete</button>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
