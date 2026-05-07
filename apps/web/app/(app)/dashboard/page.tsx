import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { getManagedProfile } from "@/lib/profiles";
import { formatBytes } from "@/lib/utils";

export default async function DashboardPage() {
  const u = await requireUser();
  const profile = await getManagedProfile(u.id, null);
  const ent = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });
  const publicPath = profile?.published && profile.publicPath ? profile.publicPath : null;

  return (
    <div className="space-y-6">
      <section className="card p-6" data-testid="dash-hero">
        <p className="text-xs uppercase tracking-[0.2em] text-gold">Your VoidCard</p>
        <h1 className="mt-1 font-display text-3xl">{u.displayName ?? `@${u.username ?? "you"}`}</h1>
        <p className="mt-1 text-sm text-ivory-dim">
          {u.plan === "free" ? "Free plan — every customization is yours." : `${u.plan.toUpperCase()} member`}
          {u.verified && <span className="ml-2 text-gold">✓ Verified</span>}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link href="/edit" className="btn-gold">Open editor</Link>
          {publicPath ? (
            <Link href={publicPath} className="btn-ghost">View public page</Link>
          ) : (
            <span className="btn-ghost cursor-not-allowed opacity-60">View public page</span>
          )}
          <Link href="/profiles" className="btn-ghost">Manage profiles</Link>
          <Link href="/share" className="btn-ghost">Share</Link>
        </div>
        {!publicPath && (
          <p className="mt-3 text-xs text-ivory-mute">
            Set your username and publish your profile before opening the public page.
          </p>
        )}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Storage</p>
          <p className="mt-2 font-display text-2xl text-gold-grad">{formatBytes(ent.storageBytes)}</p>
          <p className="mt-1 text-xs text-ivory-dim">Buy a card to add 1 GB (cap +25 GB).</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Profiles</p>
          <p className="mt-2 font-display text-2xl text-gold-grad">{ent.profilesMax === Infinity ? "∞" : ent.profilesMax}</p>
          <p className="mt-1 text-xs text-ivory-dim">{ent.multiProfileVariants ? "Multiple personas unlocked." : "Pro: up to 10 personas."}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Verified</p>
          <p className="mt-2 font-display text-2xl text-gold-grad">{u.verified ? "✓" : "—"}</p>
          <Link href="/account/verify" className="mt-1 inline-block text-xs text-gold hover:underline">
            {u.verified ? "Manage" : "Get verified · $5 (free with metal card)"}
          </Link>
        </div>
      </section>

      {!ent.removeBranding && (
        <section className="card p-5" data-testid="upgrade-card">
          <p className="text-xs uppercase tracking-widest text-gold">Pro · $4.99/mo</p>
          <p className="mt-1 font-display text-xl">Custom domain, no branding, multi-profile, API.</p>
          <Link href="/pricing" className="btn-gold mt-3 inline-flex">See Pro</Link>
        </section>
      )}
    </div>
  );
}
