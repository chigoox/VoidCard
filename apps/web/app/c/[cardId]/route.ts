import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashIpEdge } from "@/lib/ip-hash-edge";
import { queueWebhookEvent } from "@/lib/webhook-queue";

export const runtime = "edge";

// NFC tap: /c/<cardId>  →  302 /u/<username> + log tap (deduped 1h per IP+card via Redis).
export async function GET(req: Request, { params }: { params: Promise<{ cardId: string }> }) {
  const { cardId } = await params;
  const admin = createAdminClient();

  const { data: card } = await admin
    .from("vcard_cards")
    .select("id, user_id, status")
    .eq("id", cardId)
    .maybeSingle();

  if (!card) return new NextResponse("Card not found", { status: 404 });

  if (card.status === "lost" || card.status === "replaced") {
    return new NextResponse("This card has been deactivated.", { status: 410 });
  }

  // Unpaired card → first-tap pair flow.
  if (!card.user_id || card.status === "unprovisioned" || card.status === "sold") {
    return NextResponse.redirect(new URL(`/cards/pair?cardId=${cardId}`, req.url), 302);
  }

  // Resolve username for redirect target.
  const { data: ext } = await admin
    .from("vcard_profile_ext")
    .select("username")
    .eq("user_id", card.user_id)
    .maybeSingle();

  if (!ext?.username) {
    return new NextResponse("Profile unavailable", { status: 404 });
  }

  // Fire-and-forget tap log + last_tap bookkeeping.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
  const ua = req.headers.get("user-agent") || "";
  const ref = req.headers.get("referer") || null;
  const ipHash = await hashIpEdge(ip);

  void admin
    .from("vcard_taps")
    .insert({
      user_id: card.user_id,
      card_id: card.id,
      source: "nfc",
      ip_hash: ipHash,
      ua_hash: ua.slice(0, 200),
      referrer: ref,
    })
    .then(() => queueWebhookEvent(card.user_id, "tap.created", { source: "nfc", card_id: card.id, created_at: new Date().toISOString() }))
    .then(() => null, () => null);
  void admin
    .from("vcard_cards")
    .update({ last_tap_at: new Date().toISOString() })
    .eq("id", card.id)
    .then(() => null, () => null);

  const dest = new URL(`/u/${ext.username}`, req.url);
  return NextResponse.redirect(dest, 302);
}
