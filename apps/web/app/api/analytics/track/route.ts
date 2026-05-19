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
  variantId?: string;
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
  const uaHash = await hashTextEdge(ua);
  const geo = geoFromHeaders(req.headers);

  const { error } = await admin.from("vcard_taps").insert({
    user_id: userId,
    card_id: body.cardId ?? null,
    shortlink_id: body.shortlinkId ?? null,
    source: (body.source ?? "embed").slice(0, 16),
    ip_hash: ipHash,
    ua_hash: uaHash,
    country: geo.country,
    region: geo.region,
    city: geo.city,
    referrer: body.referrer?.slice(0, 500) ?? null,
    utm: body.utm ?? null,
  });

  if (error) return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });

  if (body.variantId) {
    void incrementVariantViews(admin, body.variantId, userId).catch(() => null);
  }

  void queueWebhookEvent(userId, "tap.created", {
    source: (body.source ?? "embed").slice(0, 16),
    card_id: body.cardId ?? null,
    shortlink_id: body.shortlinkId ?? null,
    referrer: body.referrer?.slice(0, 500) ?? null,
    created_at: new Date().toISOString(),
  }).catch(() => null);
  return NextResponse.json({ ok: true });
}

async function incrementVariantViews(admin: ReturnType<typeof createAdminClient>, variantId: string, userId: string) {
  const { data } = await admin
    .from("vcard_ab_variants")
    .select("views")
    .eq("id", variantId)
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return;
  await admin.from("vcard_ab_variants").update({ views: Number(data.views ?? 0) + 1 }).eq("id", variantId).eq("user_id", userId);
}

async function hashTextEdge(value: string) {
  const data = new TextEncoder().encode(value);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

function geoFromHeaders(headers: Headers) {
  return {
    country: cleanGeo(headers.get("x-vercel-ip-country")) ?? cleanGeo(headers.get("cf-ipcountry")),
    region: cleanGeo(headers.get("x-vercel-ip-country-region")),
    city: cleanGeo(decodeGeo(headers.get("x-vercel-ip-city"))),
  };
}

function decodeGeo(value: string | null) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function cleanGeo(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? trimmed.slice(0, 80) : null;
}
