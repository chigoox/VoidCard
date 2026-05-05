import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findPublicProfileByUsername } from "@/lib/profiles";
import { hashIpEdge } from "@/lib/ip-hash-edge";
import { rateLimits } from "@/lib/rate-limit";
import { queueWebhookEvent } from "@/lib/webhook-queue";

export const runtime = "edge";

type TrackBody = {
  username?: string;
  source?: string;
  cardId?: string;
  shortlinkId?: string;
  utm?: Record<string, string>;
  referrer?: string;
};

export async function POST(req: Request) {
  let body: TrackBody;
  try {
    body = (await req.json()) as TrackBody;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  if (!body.username && !body.cardId && !body.shortlinkId) {
    return NextResponse.json({ ok: false, error: "missing_target" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";

  // Rate limit per IP.
  const rl = await rateLimits.analyticsTrack.limit(`track:${ip}`);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const admin = createAdminClient();

  let userId: string | null = null;
  if (body.username) {
    const profile = await findPublicProfileByUsername(body.username);
    userId = profile?.ownerUserId ?? null;
  } else if (body.cardId) {
    const { data } = await admin
      .from("vcard_cards")
      .select("user_id")
      .eq("id", body.cardId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  } else if (body.shortlinkId) {
    const { data } = await admin
      .from("vcard_shortlinks")
      .select("user_id")
      .eq("id", body.shortlinkId)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }
  if (!userId) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }

  const ipHash = await hashIpEdge(ip);
  const ua = req.headers.get("user-agent") || "";

  const { error } = await admin.from("vcard_taps").insert({
    user_id: userId,
    card_id: body.cardId ?? null,
    shortlink_id: body.shortlinkId ?? null,
    source: (body.source ?? "embed").slice(0, 16),
    ip_hash: ipHash,
    ua_hash: ua.slice(0, 200),
    referrer: body.referrer?.slice(0, 500) ?? null,
    utm: body.utm ?? null,
  });

  if (error) return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });

  void queueWebhookEvent(userId, "tap.created", {
    source: (body.source ?? "embed").slice(0, 16),
    card_id: body.cardId ?? null,
    shortlink_id: body.shortlinkId ?? null,
    referrer: body.referrer?.slice(0, 500) ?? null,
    created_at: new Date().toISOString(),
  }).catch(() => null);
  return NextResponse.json({ ok: true });
}
