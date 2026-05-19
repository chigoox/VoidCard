import "server-only";

import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";
import { findPublicProfileByUsername } from "@/lib/profiles";

const PUBLIC_PROFILE_REVALIDATE_SECONDS = 60;

export function publicProfileCacheTag(username: string) {
  return `public-profile:${username.trim().toLowerCase()}`;
}

export async function findCachedPublicProfileByUsername(username: string) {
  const normalized = username.trim().toLowerCase();
  return unstable_cache(
    () => findPublicProfileByUsername(normalized),
    ["vcard-public-profile", normalized],
    {
      revalidate: PUBLIC_PROFILE_REVALIDATE_SECONDS,
      tags: [publicProfileCacheTag(normalized)],
    },
  )();
}

export function revalidatePublicProfile(usernameOrPath: string | null | undefined) {
  if (!usernameOrPath) return;
  const username = usernameOrPath.startsWith("/u/") ? usernameOrPath.slice(3) : usernameOrPath;
  const normalized = username.trim().toLowerCase();
  if (!normalized) return;
  revalidatePath(`/u/${normalized}`);
  revalidateTag(publicProfileCacheTag(normalized), "max");
}