import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { rateLimits } from "@/lib/rate-limit";

const Body = z.object({
  email: z.string().email(),
  password: z.string().min(1).max(72),
  next: z.string().nullable().optional(),
});

function normalizeInternalPath(value: string | null | undefined) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function buildCallbackPath(nextPath: string | null) {
  const params = new URLSearchParams();
  if (nextPath) params.set("next", nextPath);
  const query = params.toString();
  return query ? `/auth/callback?${query}` : "/auth/callback";
}

export async function POST(req: Request) {
  let payload: unknown;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = Body.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_credentials" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  const rl = await rateLimits.auth.limit(`ip:${ip}`);
  if (!rl.success) {
    return NextResponse.json({ error: "too_many" }, { status: 429 });
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    redirectTo: buildCallbackPath(normalizeInternalPath(parsed.data.next)),
  });
}
