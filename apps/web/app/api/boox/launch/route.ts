import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mintBooxSsoToken, getBooxBaseUrl } from "@/lib/boox/sso";

export const runtime = "nodejs";

/**
 * GET /api/boox/launch?next=/<owner>/Admin
 *
 * Authenticates the current Supabase user, mints a short-lived SSO JWT,
 * and redirects to Boox's /sso page which exchanges the JWT for a Firebase
 * custom token and signs the user in.
 *
 * If unauthenticated, redirects to /login with the original launch URL as
 * the post-login destination.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = url.searchParams.get("next") || "/";

  // Only allow same-origin paths or boox-app paths (no full URLs to avoid open redirect).
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) {
    const loginUrl = new URL("/login", url);
    loginUrl.searchParams.set("redirect", `/api/boox/launch?next=${encodeURIComponent(safeNext)}`);
    return NextResponse.redirect(loginUrl);
  }

  if (!user.email) {
    return NextResponse.json({ error: "missing_email" }, { status: 400 });
  }

  let token: string;
  try {
    token = await mintBooxSsoToken({
      userId: user.id,
      email: user.email,
      name: (user.user_metadata?.name as string | undefined) ?? null,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "sso_mint_failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }

  const target = new URL(`${getBooxBaseUrl()}/sso`);
  target.searchParams.set("t", token);
  target.searchParams.set("next", safeNext);
  return NextResponse.redirect(target.toString());
}
