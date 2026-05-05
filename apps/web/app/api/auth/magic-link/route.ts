import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

const Body = z.object({
  email: z.string().email(),
  next: z.string().nullable().optional(),
});

function normalizeOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  const cleaned = value.trim().replace(/^['"]|['"]$/g, "");
  if (!cleaned) return null;
  try {
    return new URL(cleaned).origin;
  } catch {
    return null;
  }
}

function normalizeInternalPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function getAuthCallbackUrl(req: Request, nextPath: string | null) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const origin = host
    ? `${req.headers.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https")}://${host}`
    : normalizeOrigin(process.env.NEXT_PUBLIC_SITE_URL) ?? new URL(req.url).origin;
  const callbackUrl = new URL("/auth/callback", origin);
  if (nextPath) callbackUrl.searchParams.set("next", nextPath);
  return callbackUrl.toString();
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = Body.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "invalid_email" }, { status: 400 });

  const supabase = await createClient();
  const emailRedirectTo = getAuthCallbackUrl(req, normalizeInternalPath(parsed.data.next));
  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: { emailRedirectTo },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
