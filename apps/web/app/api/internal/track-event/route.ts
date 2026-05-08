import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * POST /api/internal/track-event
 * Auth: Authorization: Bearer ${ED5_SERVICE_SECRET}
 * Body: { uid: string, type: "booking.created" | "booking.cancelled", payload?: object }
 *
 * Records sister-app conversions as taps so they show up in VoidCard analytics.
 */
type Body = {
  uid?: string;
  type?: string;
  payload?: Record<string, unknown>;
};

const ALLOWED_TYPES = new Set(["booking.created", "booking.cancelled"]);

export async function POST(req: Request) {
  const secret = process.env.ED5_SERVICE_SECRET;
  if (!secret) return NextResponse.json({ error: "service_not_configured" }, { status: 500 });
  const authHeader = req.headers.get("authorization") || "";
  const presented = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!presented || presented !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }

  if (!body.uid || !body.type || !ALLOWED_TYPES.has(body.type)) {
    return NextResponse.json({ error: "invalid_event" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Confirm uid exists as a VoidCard user; otherwise drop silently (Boox-only user).
  const { data: profile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", body.uid)
    .maybeSingle();
  if (!profile) return NextResponse.json({ ok: true, dropped: "no_profile" });

  // Record as a tap with source "boox" so it surfaces in analytics charts.
  const { error } = await admin.from("vcard_taps").insert({
    user_id: body.uid,
    source: body.type === "booking.created" ? "boox-book" : "boox-cancel",
    referrer: typeof body.payload?.refUrl === "string" ? body.payload.refUrl.slice(0, 500) : null,
    utm: body.payload ?? null,
  });
  if (error) return NextResponse.json({ error: "insert_failed" }, { status: 500 });

  return NextResponse.json({ ok: true });
}
