import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { getManagedProfile, listOwnedProfiles, profileAppPath } from "@/lib/profiles";
import { SettingsClient } from "./SettingsClient";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const u = await requireUser();
  const entitlements = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedProfileId = typeof resolvedSearchParams.profile === "string" ? resolvedSearchParams.profile : null;
  const [profiles, activeProfile] = await Promise.all([
    listOwnedProfiles(u.id),
    getManagedProfile(u.id, requestedProfileId),
  ]);

  if (!activeProfile) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="font-display text-2xl text-gold-grad">Settings</h1>
        <p className="mt-1 text-sm text-ivory-dim">Profile and account.</p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {profiles.map((profile) => (
            <Link
              key={profile.id}
              href={profileAppPath("/settings", profile.id)}
              className={[
                "rounded-pill border px-3 py-1.5 text-xs uppercase tracking-widest",
                profile.id === activeProfile.id
                  ? "border-gold/60 bg-onyx-900 text-gold"
                  : "border-onyx-700 text-ivory-dim hover:border-gold/40 hover:text-gold",
              ].join(" ")}
            >
              {profile.displayName?.trim() || (profile.username ? `@${profile.username}` : "Profile")}
            </Link>
          ))}
          <Link href="/profiles" className="btn-ghost">Manage profiles</Link>
        </div>
      </header>

      <SettingsClient
        profileId={activeProfile.id}
        username={activeProfile.username ?? u.username ?? ""}
        initial={{
          displayName: activeProfile.displayName ?? "",
          bio: activeProfile.bio ?? "",
          avatarUrl: activeProfile.avatarUrl ?? "",
          customCss: activeProfile.customCss ?? "",
          hasProfilePassword: typeof activeProfile.passwordHash === "string" && activeProfile.passwordHash.length > 0,
        }}
        canUsePasswordProtection={entitlements.passwordProtected}
      />

      <section className="card p-6">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">Plan</p>
        <p className="mt-2 font-display text-xl">{u.plan.toUpperCase()}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/profiles" className="btn-ghost">Profiles</Link>
          <Link href="/pricing" className="btn-ghost">Compare plans</Link>
          <Link href="/account/billing" className="btn-ghost">Billing portal</Link>
          <Link href="/variants" className="btn-ghost">A/B variants</Link>
          <Link href="/fonts" className="btn-ghost">Custom fonts</Link>
        </div>
      </section>

      <section className="card p-6">
        <p className="text-xs uppercase tracking-widest text-ivory-mute">Account</p>
        <p className="mt-2 text-sm text-ivory-dim">Email: {u.email}</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href="/account/security" className="btn-ghost">Security</Link>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="btn-ghost">Sign out</button>
          </form>
        </div>
      </section>
    </div>
  );
}
