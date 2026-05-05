import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { entitlementsFor } from "@/lib/entitlements";
import { findPublicProfileByUsername } from "@/lib/profiles";
import {
  profileUnlockCookieName,
  verifyProfileUnlockCookieValue,
} from "@/lib/profile-password";
import { SITE_URL } from "@/lib/seo";

export const runtime = "edge";
export const revalidate = 60;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const profile = await findPublicProfileByUsername(username);
  if (!profile) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const handle = profile.username ?? username.toLowerCase();
  const entitlements = entitlementsFor(profile.plan ?? "free", {
    extraStorageBytes: Number(profile.bonusStorageBytes ?? 0),
  });
  const passwordHash = typeof profile.passwordHash === "string" ? profile.passwordHash : null;
  if (entitlements.passwordProtected && passwordHash) {
    const cookieStore = await cookies();
    const isUnlocked = await verifyProfileUnlockCookieValue(
      handle,
      passwordHash,
      cookieStore.get(profileUnlockCookieName(handle))?.value,
    );
    if (!isUnlocked) {
      return NextResponse.json(
        { error: "password_required", username: handle },
        {
          status: 401,
          headers: { "cache-control": "private, no-store" },
        },
      );
    }
  }

  if (profile.aiIndexing === "disallow_all") {
    return NextResponse.json(
      { error: "noai", username: handle },
      {
        status: 403,
        headers: { "X-Robots-Tag": "noai, noimageai, noindex" },
      },
    );
  }

  return NextResponse.json(
    {
      schema_version: 1,
      url: `${SITE_URL}/u/${handle}`,
      username: handle,
      display_name: profile.displayName,
      avatar_url: profile.avatarUrl,
      bio: profile.bio,
      verified: profile.verified === true,
      links: profile.links,
      updated_at: profile.updatedAt,
    },
    {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
        ...(profile.aiIndexing === "allow_all" ? {} : { "X-Robots-Tag": "noai" }),
      },
    },
  );
}
