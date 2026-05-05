import { NextResponse } from "next/server";
import { entitlementsFor } from "@/lib/entitlements";
import { findPublicProfileByUsername } from "@/lib/profiles";
import {
  createProfileUnlockCookieValue,
  profileUnlockCookieName,
  verifyProfilePassword,
} from "@/lib/profile-password";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const formData = await request.formData();
  const password = typeof formData.get("password") === "string" ? String(formData.get("password")).trim() : "";
  const nextPath =
    typeof formData.get("next") === "string" && String(formData.get("next")).startsWith("/")
      ? String(formData.get("next"))
      : `/u/${username.toLowerCase()}`;

  const profile = await findPublicProfileByUsername(username);
  if (!profile) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const handle = profile.username ?? username.toLowerCase();
  const entitlements = entitlementsFor(profile.plan ?? "free", {
    extraStorageBytes: Number(profile.bonusStorageBytes ?? 0),
  });
  const targetUrl = new URL(nextPath, request.url);
  const passwordHash = typeof profile.passwordHash === "string" ? profile.passwordHash : null;

  if (!passwordHash || !entitlements.passwordProtected) {
    return NextResponse.redirect(targetUrl);
  }

  if (!password) {
    targetUrl.searchParams.set("unlock", "required");
    return NextResponse.redirect(targetUrl);
  }

  const valid = await verifyProfilePassword(password, passwordHash);
  if (!valid) {
    targetUrl.searchParams.set("unlock", "invalid");
    return NextResponse.redirect(targetUrl);
  }

  const cookie = await createProfileUnlockCookieValue(handle, passwordHash);
  const response = NextResponse.redirect(targetUrl);
  if (cookie) {
    response.cookies.set(profileUnlockCookieName(handle), cookie.value, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: cookie.maxAge,
      path: `/u/${handle}`,
    });
  }
  return response;
}