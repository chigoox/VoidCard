import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { queueWebhookEvent } from "@/lib/webhook-queue";

export const runtime = "edge";

export async function GET(_: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_shortlinks")
    .select("id, target, user_id, expires_at")
    .eq("code", code)
    .maybeSingle();

  if (!data || (data.expires_at && new Date(data.expires_at).getTime() < Date.now())) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Fire-and-forget tap row (hit count handled by trigger or cron rollup)
  void admin
    .from("vcard_taps")
    .insert({ user_id: data.user_id, source: "qr", ua_hash: "edge", ip_hash: "edge" })
    .then(() => queueWebhookEvent(data.user_id, "tap.created", { source: "qr", shortlink_id: data.id, created_at: new Date().toISOString() }))
    .then(() => null, () => null);

  return NextResponse.redirect(data.target, 308);
}
