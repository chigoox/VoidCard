import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { publicAssetUrl } from "@/lib/cdn";
import { entitlementsFor } from "@/lib/entitlements";
import { getManagedProfile, listOwnedProfiles, profileAppPath } from "@/lib/profiles";
import { Sections } from "@/lib/sections/types";
import { createClient } from "@/lib/supabase/server";
import EditorClient from "./EditorClient";

function themeId(theme: unknown) {
  if (theme && typeof theme === "object" && "id" in theme) {
    const id = (theme as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  return "onyx-gold";
}

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
  const supabase = await createClient();
  const { data: mediaRows } = await supabase
    .from("vcard_media")
    .select("id, kind, mime, bucket, storage_path, created_at")
    .eq("user_id", u.id)
    .eq("bucket", "vcard-public")
    .order("created_at", { ascending: false })
    .limit(24);

  const recentMedia = (mediaRows ?? []).flatMap((media) => {
    if ((media.kind !== "image" && media.kind !== "video") || !media.storage_path) {
      return [];
    }
    const { data } = supabase.storage.from("vcard-public").getPublicUrl(media.storage_path);
    return [{
      id: media.id,
      kind: media.kind,
      mime: media.mime,
      createdAt: media.created_at ?? new Date().toISOString(),
      url: publicAssetUrl(data.publicUrl) ?? data.publicUrl,
    }];
  });

  return (
    <div className="space-y-6">
      {profiles.length > 1 ? (
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
        </header>
      ) : null}

      <EditorClient
        initial={sections}
        username={activeProfile.username ?? u.username ?? ""}
        profileId={activeProfile.id}
        initialThemeId={themeId(activeProfile.theme)}
        initialCustomCss={activeProfile.customCss ?? ""}
        recentMedia={recentMedia}
        initialScheduledPublishAt={activeProfile.scheduledPublishAt}
        canSchedule={entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes }).scheduledPublish}
        canAbVariants={entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes }).abVariants}
      />
    </div>
  );
}
