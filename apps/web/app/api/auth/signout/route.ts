import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

function normalizeOrigin(value: string | null | undefined) {
  if (!value) return null;
  const cleaned = value.trim().replace(/^['"]|['"]$/g, "");
  if (!cleaned) return null;
  try {
    return new URL(cleaned).origin;
  } catch {
    return null;
  }
}

function getRequestOrigin(req: Request) {
  const forwardedHost = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (forwardedHost) {
    const proto = req.headers.get("x-forwarded-proto") ?? (forwardedHost.includes("localhost") ? "http" : "https");
    return `${proto}://${forwardedHost}`;
  }
  return normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ?? new URL(req.url).origin;
}

export async function POST(req: Request) {
  const sb = await createClient();
  await sb.auth.signOut();
  return NextResponse.redirect(new URL("/", getRequestOrigin(req)), { status: 303 });
}
