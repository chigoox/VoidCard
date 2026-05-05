import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { hashIpEdge } from "@/lib/ip-hash-edge";
import { queueWebhookEvent } from "@/lib/webhook-queue";

export const runtime = "edge";

// Short-link redirect: /s/<slug>  →  308 target + log click.
export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data } = await admin
    .from("vcard_shortlinks")
    .select("id, user_id, target, expires_at")
    .eq("code", slug)
    .maybeSingle();

  if (!data) return new NextResponse("Not found", { status: 404 });
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return new NextResponse("Link expired", { status: 410 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
  const ipHash = await hashIpEdge(ip);
  const ua = req.headers.get("user-agent") || "";
  const ref = req.headers.get("referer") || null;

  void admin
    .from("vcard_taps")
    .insert({
      user_id: data.user_id,
      shortlink_id: data.id,
      source: "link",
      ip_hash: ipHash,
      ua_hash: ua.slice(0, 200),
      referrer: ref,
    })
    .then(() => queueWebhookEvent(data.user_id, "tap.created", { source: "link", shortlink_id: data.id, created_at: new Date().toISOString() }))
    .then(() => null, () => null);

  return NextResponse.redirect(data.target, 308);
}
