import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { listOwnedProfiles, profileAppPath } from "@/lib/profiles";
import { createProfileAction, deleteProfileAction } from "./actions";

export const dynamic = "force-dynamic";

function messageFor(searchParams: Record<string, string | string[] | undefined>) {
  const error = typeof searchParams.error === "string" ? searchParams.error : null;
  if (!error) return searchParams.deleted === "1" ? "Profile removed." : null;

  switch (error) {
    case "pro_required":
      return "Multi-profile is available on Pro and Team.";
    case "profile_limit":
      return "You have reached your profile limit for this plan.";
    case "invalid_username":
      return "Username must be 3-32 lowercase letters, numbers, dot, dash, or underscore.";
    case "username_reserved":
      return "That username is reserved.";
    case "username_taken":
      return "That username is already taken.";
    case "primary_profile_locked":
      return "Your primary profile cannot be deleted.";
    default:
      return "Could not update profiles.";
  }
}

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const entitlements = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  const profiles = await listOwnedProfiles(user.id);
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const message = messageFor(resolvedSearchParams);
  const canCreateProfiles = entitlements.profilesMax > 1 && profiles.length < entitlements.profilesMax;

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl text-gold-grad">Profiles</h1>
        <p className="text-sm text-ivory-dim">
          Manage every public persona on your account. Primary profile included: {profiles.length}
          {entitlements.profilesMax === Infinity ? " / ∞" : ` / ${entitlements.profilesMax}`}.
        </p>
        {message ? <p className="text-sm text-ivory-mute">{message}</p> : null}
      </header>

      <section className="card p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Create profile</p>
            <p className="mt-2 text-sm text-ivory-dim">
              Additional published profiles unlock on Pro and Team. Free keeps your stored extras but only your primary profile stays live.
            </p>
          </div>
          {!canCreateProfiles && entitlements.profilesMax <= 1 ? <Link href="/pricing" className="btn-gold">Upgrade</Link> : null}
        </div>
        {entitlements.profilesMax > 1 ? (
          <form action={createProfileAction} className="mt-5 grid gap-3 md:grid-cols-[1fr,1fr,auto]" data-testid="profile-create-form">
            <input
              name="username"
              required
              maxLength={32}
              placeholder="username"
              className="rounded-pill border border-onyx-600 bg-onyx-900 px-4 py-2.5 outline-none focus:border-gold/60"
              data-testid="profile-create-username"
            />
            <input
              name="displayName"
              maxLength={64}
              placeholder="Display name (optional)"
              className="rounded-pill border border-onyx-600 bg-onyx-900 px-4 py-2.5 outline-none focus:border-gold/60"
              data-testid="profile-create-display-name"
            />
            <button type="submit" disabled={!canCreateProfiles} className="btn-gold" data-testid="profile-create-submit">
              {canCreateProfiles ? "Create profile" : "Limit reached"}
            </button>
          </form>
        ) : null}
      </section>

      <div className="space-y-3">
        {profiles.map((profile) => {
          const settingsHref = profileAppPath("/settings", profile.id);
          const editHref = profileAppPath("/edit", profile.id);
          return (
            <section key={profile.id} className="card flex flex-wrap items-center justify-between gap-4 p-5" data-testid={`profile-row-${profile.id}`}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-xl text-ivory">
                    {profile.displayName?.trim() || (profile.username ? `@${profile.username}` : "Untitled profile")}
                  </h2>
                  <span className="rounded-pill border border-onyx-700 px-2.5 py-1 text-[11px] uppercase tracking-widest text-ivory-mute">
                    {profile.isPrimary ? "Primary" : "Extra"}
                  </span>
                  <span className="rounded-pill border border-onyx-700 px-2.5 py-1 text-[11px] uppercase tracking-widest text-ivory-mute">
                    {profile.published ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-ivory-dim">
                  {profile.username ? `@${profile.username}` : "No username"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link href={settingsHref} className="btn-ghost">Settings</Link>
                <Link href={editHref} className="btn-ghost">Edit</Link>
                {profile.publicPath ? <Link href={profile.publicPath} className="btn-ghost">View</Link> : null}
                {!profile.isPrimary ? (
                  <form action={deleteProfileAction}>
                    <input type="hidden" name="id" value={profile.id} />
                    <button type="submit" className="btn-ghost text-red-300" data-testid={`profile-delete-${profile.id}`}>Delete</button>
                  </form>
                ) : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}