import { NextResponse } from "next/server";
import { z } from "zod";
import { stripe } from "@/lib/stripe";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimits } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({ orderId: z.string().uuid() });

export async function POST(req: Request) {
  const u = await requireUser();
  const limited = await rateLimits.publish.limit(u.id);
  if (!limited.success) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: order, error } = await admin
    .from("vcard_seller_orders")
    .select("id, seller_user_id, stripe_payment_intent, stripe_account_id, status, total_cents, items")
    .eq("id", parsed.data.orderId)
    .maybeSingle();

  if (error || !order) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  if (order.seller_user_id !== u.id) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }
  if (order.status === "refunded") {
    return NextResponse.json({ ok: false, error: "already_refunded" }, { status: 409 });
  }
  if (!order.stripe_payment_intent) {
    return NextResponse.json({ ok: false, error: "no_payment_intent" }, { status: 400 });
  }

  try {
    await stripe.refunds.create({
      payment_intent: order.stripe_payment_intent,
      reverse_transfer: true,
      refund_application_fee: true,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? "stripe_error" },
      { status: 500 },
    );
  }

  await admin
    .from("vcard_seller_orders")
    .update({ status: "refunded" })
    .eq("id", order.id);

  // Restore inventory for tracked products (best-effort).
  try {
    const items = (order.items ?? []) as Array<{ product_id?: string; quantity?: number }>;
    for (const it of items) {
      if (!it?.product_id) continue;
      const { data: prod } = await admin
        .from("vcard_seller_products")
        .select("inventory")
        .eq("id", it.product_id)
        .maybeSingle();
      if (prod && typeof prod.inventory === "number") {
        await admin
          .from("vcard_seller_products")
          .update({ inventory: prod.inventory + (it.quantity || 1) })
          .eq("id", it.product_id);
      }
    }
  } catch {
    // best-effort
  }

  return NextResponse.json({ ok: true });
}
