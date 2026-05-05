import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { createVariant, updateVariant, deleteVariant } from "./actions";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Variant = {
  id: string;
  name: string;
  weight: number;
  enabled: boolean;
  starts_at: string | null;
  ends_at: string | null;
  views: number;
  conversions: number;
};

export default async function VariantsPage() {
  const u = await requireUser();
  const ents = entitlementsFor(u.plan);

  if (!ents.abVariants) {
    return (
      <div className="space-y-4">
        <h1 className="font-display text-3xl text-gold-grad">A/B Variants</h1>
        <div className="card p-6">
          <p className="text-sm text-ivory-mute">A/B variants are a Pro feature.</p>
          <Link href="/pricing" className="btn-primary mt-4 inline-block">Upgrade to Pro</Link>
        </div>
      </div>
    );
  }

  const sb = await createClient();
  const { data } = await sb
    .from("vcard_ab_variants")
    .select("id, name, weight, enabled, starts_at, ends_at, views, conversions")
    .eq("user_id", u.id)
    .order("created_at", { ascending: false });
  const variants = (data as Variant[] | null) ?? [];

  const totalWeight = variants.filter((v) => v.enabled).reduce((s, v) => s + v.weight, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-gold-grad">A/B Variants</h1>
        <p className="mt-1 text-sm text-ivory-mute">
          Run weighted experiments on your published profile. Active weight: {totalWeight}% (rest sees baseline).
        </p>
      </div>

      <form action={createVariant} className="card flex flex-wrap items-end gap-3 p-4" data-testid="variant-create-form">
        <div>
          <label className="block text-xs uppercase tracking-widest text-ivory-mute">Name</label>
          <input name="name" required maxLength={80} className="input" placeholder="Hero V2" data-testid="variant-name-input" />
        </div>
        <div>
          <label className="block text-xs uppercase tracking-widest text-ivory-mute">Weight %</label>
          <input name="weight" type="number" min="0" max="100" defaultValue="50" className="input w-20" data-testid="variant-weight-input" />
        </div>
        <button type="submit" className="btn-primary" data-testid="variant-create-submit">Create draft</button>
        <span className="text-xs text-ivory-mute">Copies your current sections as a starting point.</span>
      </form>

      <div className="card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-onyx-700/60 bg-onyx-900/40 text-xs uppercase tracking-widest text-ivory-mute">
            <tr>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Weight</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Views</th>
              <th className="px-4 py-3">Conv.</th>
              <th className="px-4 py-3">CR</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-onyx-700/60">
            {variants.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ivory-mute">No variants yet.</td></tr>
            )}
            {variants.map((v) => (
              <tr key={v.id} data-testid={`variant-row-${v.id}`}>
                <td className="px-4 py-3">{v.name}</td>
                <td className="px-4 py-3 tabular-nums">{v.weight}%</td>
                <td className="px-4 py-3 text-xs">
                  {v.enabled ? <span className="text-emerald-400">live</span> : <span className="text-ivory-mute">draft</span>}
                </td>
                <td className="px-4 py-3 tabular-nums">{v.views}</td>
                <td className="px-4 py-3 tabular-nums">{v.conversions}</td>
                <td className="px-4 py-3 tabular-nums text-xs text-ivory-mute">
                  {v.views > 0 ? ((v.conversions / v.views) * 100).toFixed(1) + "%" : "—"}
                </td>
                <td className="px-4 py-3 space-x-2 text-xs">
                  <form action={updateVariant} className="inline">
                    <input type="hidden" name="id" value={v.id} />
                    <input type="hidden" name="enabled" value={(!v.enabled).toString()} />
                    <button className="text-gold hover:underline" type="submit" data-testid={`variant-toggle-${v.id}`}>{v.enabled ? "pause" : "enable"}</button>
                  </form>
                  <form action={deleteVariant} className="inline">
                    <input type="hidden" name="id" value={v.id} />
                    <button className="text-red-400 hover:underline" type="submit" data-testid={`variant-delete-${v.id}`}>delete</button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
