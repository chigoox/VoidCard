import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  orderId: z.string().uuid(),
  trackingNumber: z.string().trim().max(120).optional(),
  carrier: z.string().trim().max(60).optional(),
});

export async function POST(req: Request) {
  const u = await requireUser();
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order } = await admin
    .from("vcard_seller_orders")
    .select("id, seller_user_id, status, metadata")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (!order) return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  if (order.seller_user_id !== u.id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (order.status !== "paid") {
    return NextResponse.json({ ok: false, error: "not_paid" }, { status: 409 });
  }

  const metadata = {
    ...((order.metadata ?? {}) as Record<string, unknown>),
    ...(parsed.data.trackingNumber ? { tracking_number: parsed.data.trackingNumber } : {}),
    ...(parsed.data.carrier ? { carrier: parsed.data.carrier } : {}),
    fulfilled_at: new Date().toISOString(),
  };

  await admin
    .from("vcard_seller_orders")
    .update({ status: "fulfilled", metadata })
    .eq("id", order.id);

  return NextResponse.json({ ok: true });
}
