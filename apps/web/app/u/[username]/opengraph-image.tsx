import { ImageResponse } from "next/og";
import { cookies } from "next/headers";
import { entitlementsFor } from "@/lib/entitlements";
import { findPublicProfileByUsername } from "@/lib/profiles";
import {
  profileUnlockCookieName,
  verifyProfileUnlockCookieValue,
} from "@/lib/profile-password";

export const runtime = "nodejs";
export const alt = "VoidCard profile";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image({
  params,
}: {
  params: { username: string };
}) {
  let profile: Awaited<ReturnType<typeof findPublicProfileByUsername>> = null;
  try {
    profile = await findPublicProfileByUsername(params.username);
  } catch {
    profile = null;
  }

  const handle = profile?.username ?? params.username;
  const entitlements = entitlementsFor(profile?.plan ?? "free", {
    extraStorageBytes: Number(profile?.bonusStorageBytes ?? 0),
  });
  const passwordHash = typeof profile?.passwordHash === "string" ? profile.passwordHash : null;
  const cookieStore = await cookies();
  const isUnlocked =
    !passwordHash ||
    !entitlements.passwordProtected ||
    (await verifyProfileUnlockCookieValue(
      handle,
      passwordHash,
      cookieStore.get(profileUnlockCookieName(handle))?.value,
    ));

  const name = !isUnlocked ? "Protected profile" : profile?.displayName || `@${params.username}`;
  const verified = isUnlocked && profile?.verified === true;
  const avatar = isUnlocked ? profile?.avatarUrl || null : null;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0a0a0b 0%, #18181b 60%, #0a0a0b 100%)",
          color: "#fafafa",
          fontFamily: "sans-serif",
          padding: "80px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 56,
            left: 80,
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: "#D4A853",
          }}
        >
          VoidCard
        </div>

        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatar}
            alt=""
            width={220}
            height={220}
            style={{
              borderRadius: 9999,
              border: "4px solid #D4A853",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: 9999,
              border: "4px solid #D4A853",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 110,
              color: "#D4A853",
              background: "#18181b",
            }}
          >
            {(profile?.displayName || params.username).charAt(0).toUpperCase()}
          </div>
        )}

        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 36,
            fontSize: 72,
            fontWeight: 700,
          }}
        >
          {name}
          {verified ? (
            <span
              style={{
                marginLeft: 20,
                background: "linear-gradient(135deg, #F2D27A, #D4A853 60%, #A47A2C)",
                color: "#0a0a0b",
                fontSize: 28,
                padding: "8px 18px",
                borderRadius: 9999,
                fontWeight: 700,
              }}
            >
              VERIFIED
            </span>
          ) : null}
        </div>

        <div
          style={{
            marginTop: 12,
            fontSize: 36,
            color: "#a1a1aa",
          }}
        >
          @{handle}
        </div>

        <div
          style={{
            position: "absolute",
            bottom: 56,
            right: 80,
            fontSize: 22,
            color: "#71717a",
          }}
        >
          vcard.ed5enterprise.com
        </div>
      </div>
    ),
    {
      ...size,
      headers: {
        "cache-control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800",
      },
    },
  );
}
