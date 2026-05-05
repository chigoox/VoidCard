import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getManagedProfile, listOwnedProfiles, profileAppPath } from "@/lib/profiles";
import { Sections } from "@/lib/sections/types";
import EditorClient from "./EditorClient";

export default async function EditPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const u = await requireUser();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const requestedProfileId = typeof resolvedSearchParams.profile === "string" ? resolvedSearchParams.profile : null;
  const [profiles, activeProfile] = await Promise.all([
    listOwnedProfiles(u.id),
    getManagedProfile(u.id, requestedProfileId),
  ]);

  if (!activeProfile) {
    return null;
  }

  const sections = Sections.safeParse(activeProfile.sectionsDraft ?? []).success
    ? Sections.parse(activeProfile.sectionsDraft ?? [])
    : [];

  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          {profiles.map((profile) => (
            <Link
              key={profile.id}
              href={profileAppPath("/edit", profile.id)}
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
          <Link href={profileAppPath("/settings", activeProfile.id)} className="btn-ghost">Profile settings</Link>
        </div>
        <p className="text-sm text-ivory-dim">
          Editing {activeProfile.displayName?.trim() || (activeProfile.username ? `@${activeProfile.username}` : "profile")}.
        </p>
      </header>

      <EditorClient initial={sections} username={activeProfile.username ?? u.username ?? ""} profileId={activeProfile.id} />
    </div>
  );
}
