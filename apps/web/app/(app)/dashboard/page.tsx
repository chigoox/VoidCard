import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { getManagedProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { formatBytes } from "@/lib/utils";

export default async function DashboardPage() {
  const u = await requireUser();
  const profile = await getManagedProfile(u.id, null);
  const ent = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });
  const publicPath = profile?.published && profile.publicPath ? profile.publicPath : null;
  const sb = await createClient();
  const { count: cardCount } = await sb
    .from("vcard_cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", u.id);
  const hasPairedCard = Number(cardCount ?? 0) > 0;
  const activationItems = [
    {
      label: "Claim your handle",
      done: Boolean(u.username),
      href: "/settings",
      action: u.username ? `@${u.username}` : "Set username",
    },
    {
      label: "Publish your profile",
      done: Boolean(publicPath),
      href: "/edit",
      action: publicPath ? "Live" : "Open editor",
    },
    {
      label: "Share your profile",
      done: Boolean(publicPath),
      href: "/share",
      action: publicPath ? "Get QR + wallet" : "Publish first",
    },
    {
      label: "Pair or buy a card",
      done: hasPairedCard,
      href: hasPairedCard ? "/cards" : "/shop",
      action: hasPairedCard ? `${cardCount} paired` : "Get your card",
    },
  ];
  const activationDone = activationItems.filter((item) => item.done).length;

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
          <Link href="/shop" className="btn-ghost">Get your card</Link>
          <Link href="/cards" className="btn-ghost">My cards</Link>
          <Link href="/cards/pair" className="btn-ghost">Pair a card</Link>
          <Link href="/profiles" className="btn-ghost">Manage profiles</Link>
          <Link href="/share" className="btn-ghost">Share</Link>
          {(u.role === "admin" || u.role === "superadmin") ? (
            <Link href="/admin" className="btn-ghost" data-testid="dashboard-admin-link">Admin dashboard</Link>
          ) : null}
        </div>
        {!publicPath && (
          <p className="mt-3 text-xs text-ivory-mute">
            Set your username and publish your profile before opening the public page.
          </p>
        )}
      </section>

      <section className="card p-5" data-testid="activation-checklist">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs uppercase tracking-widest text-gold">Activation</p>
            <h2 className="mt-1 font-display text-2xl text-ivory">Get from signup to first tap.</h2>
            <p className="mt-1 text-sm text-ivory-dim">
              {activationDone} of {activationItems.length} done. The goal is a profile someone can open, save, and remember.
            </p>
          </div>
          <Link href={publicPath ? "/share" : "/edit"} className="btn-gold self-start sm:self-auto">
            {publicPath ? "Share now" : "Continue setup"}
          </Link>
        </div>
        <div className="mt-5 grid gap-2 md:grid-cols-4">
          {activationItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-card border border-onyx-700 bg-onyx-950/70 p-4 transition hover:border-gold/40"
            >
              <span
                className={[
                  "inline-flex size-7 items-center justify-center rounded-full border text-xs font-semibold",
                  item.done ? "border-gold/50 bg-gold/10 text-gold" : "border-onyx-600 text-ivory-mute",
                ].join(" ")}
                aria-hidden
              >
                {item.done ? "✓" : ""}
              </span>
              <p className="mt-3 text-sm font-medium text-ivory">{item.label}</p>
              <p className="mt-1 text-xs text-ivory-mute">{item.action}</p>
            </Link>
          ))}
        </div>
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
          <p className="text-xs uppercase tracking-widest text-gold">The card is the upgrade</p>
          <p className="mt-1 font-display text-xl">Hand over metal, then update the profile forever.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link href="/shop" className="btn-gold inline-flex">Get your card</Link>
            <Link href="/pricing" className="btn-ghost inline-flex">See Pro tools</Link>
          </div>
        </section>
      )}
    </div>
  );
}
