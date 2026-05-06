import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { validateProfileUsername } from "@/lib/profiles";
import { rateLimits } from "@/lib/rate-limit";

const Body = z.object({
  email: z.string().email(),
  username: z.string().regex(/^[a-z0-9_.-]{3,32}$/),
  password: z.string().min(8).max(72).optional(),
  next: z.string().nullable().optional(),
});

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

function normalizeInternalPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  const parsed = Body.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = await rateLimits.signup.limit(`ip:${ip}`);
  if (!rl.success) return NextResponse.json({ error: "too_many" }, { status: 429 });

  const usernameAvailability = await validateProfileUsername(parsed.data.username);
  if (!usernameAvailability.ok) {
    const status = usernameAvailability.error === "invalid_username" ? 400 : 409;
    return NextResponse.json({ error: usernameAvailability.error }, { status });
  }

  // Create auth user first; callback provisioning will attach or update the primary profile row.
  const supabase = await createClient();
  const emailRedirectTo = new URL("/auth/callback", getRequestOrigin(req));
  emailRedirectTo.searchParams.set("username", usernameAvailability.username);
  const nextPath = normalizeInternalPath(parsed.data.next);
  if (nextPath) emailRedirectTo.searchParams.set("next", nextPath);

  if (parsed.data.password) {
    const { data, error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: emailRedirectTo.toString(),
        data: { pending_username: usernameAvailability.username },
      },
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, needsEmailConfirmation: !data.session });
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: emailRedirectTo.toString(),
      data: { pending_username: usernameAvailability.username },
    },
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, needsEmailConfirmation: true });
}
