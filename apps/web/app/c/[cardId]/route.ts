import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashIpEdge } from "@/lib/ip-hash-edge";
import { queueWebhookEvent } from "@/lib/webhook-queue";

export const runtime = "edge";

function isMissingTableError(error: { message?: string | null; code?: string | null } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST205" || message.includes("schema cache") || message.includes("could not find the table");
}

async function resolveCardUsername(admin: ReturnType<typeof createAdminClient>, userId: string) {
  const { data: profile, error } = await admin.from("vcard_profile_ext").select("username").eq("user_id", userId).maybeSingle();
  if (isMissingTableError(error)) {
    const { data: sharedProfile } = await admin.from("profiles").select("username").eq("id", userId).maybeSingle();
    return typeof sharedProfile?.username === "string" ? sharedProfile.username : null;
  }

  if (error) return null;
  return typeof profile?.username === "string" ? profile.username : null;
}

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
  const username = await resolveCardUsername(admin, card.user_id);

  if (!username) {
    return new NextResponse("Profile unavailable", { status: 404 });
  }

  // Persist the tap before redirecting so the Edge runtime does not drop the write.
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
  const ua = req.headers.get("user-agent") || "";
  const ref = req.headers.get("referer") || null;
  const ipHash = await hashIpEdge(ip);
  const createdAt = new Date().toISOString();

  let tapError: { message?: string | null } | null = null;
  try {
    const { error } = await admin
      .from("vcard_taps")
      .insert({
        user_id: card.user_id,
        card_id: card.id,
        source: "nfc",
        ip_hash: ipHash,
        ua_hash: ua.slice(0, 200),
        referrer: ref,
        occurred_at: createdAt,
      });
    tapError = error;
  } catch {
    tapError = { message: "tap_insert_failed" };
  }

  if (!tapError) {
    void queueWebhookEvent(card.user_id, "tap.created", {
      source: "nfc",
      card_id: card.id,
      created_at: createdAt,
    }).catch(() => null);
  }

  const dest = new URL(`/u/${username}`, req.url);
  return NextResponse.redirect(dest, 302);
}
