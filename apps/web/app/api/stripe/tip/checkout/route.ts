import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { rateLimits } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { applicationFeeFor, getPlatformFeeBps } from "@/lib/stripe-connect";
import { loadPrimaryProfile } from "@/lib/profiles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  stripeAccountId: z.string().regex(/^acct_[A-Za-z0-9]+$/),
  amountCents: z.number().int().min(100).max(50_000),
  profileUsername: z.string().min(3).max(32).optional(),
});

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("vcard_seller_accounts")
    .select("user_id, stripe_account_id, charges_enabled")
    .eq("stripe_account_id", body.stripeAccountId)
    .maybeSingle();
  if (!account || !account.charges_enabled) {
    return NextResponse.json({ ok: false, error: "seller_not_ready" }, { status: 409 });
  }

  const buyer = await getUser();
  const key = buyer?.id ?? req.headers.get("x-forwarded-for") ?? "anon";
  const rl = await rateLimits.publish.limit(`tip-checkout:${key}:${account.user_id}`);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const sellerProfile = await loadPrimaryProfile(account.user_id);
  const bps = await getPlatformFeeBps(sellerProfile?.plan ?? "free");
  const fee = applicationFeeFor(body.amountCents, bps);
  const origin = req.headers.get("origin") ?? process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const successPath = body.profileUsername ? `/u/${encodeURIComponent(body.profileUsername)}?tip=1` : "/?tip=1";
  const cancelPath = body.profileUsername ? `/u/${encodeURIComponent(body.profileUsername)}` : "/";

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: body.amountCents,
      product_data: {
        name: "VoidCard tip",
        metadata: { seller_user_id: account.user_id, kind: "tip" },
      },
    },
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [lineItem],
      success_url: `${origin}${successPath}`,
      cancel_url: `${origin}${cancelPath}`,
      customer_email: buyer?.email ?? undefined,
      client_reference_id: buyer?.id,
      metadata: {
        kind: "tip",
        seller_user_id: account.user_id,
        buyer_user_id: buyer?.id ?? "",
        platform_fee_bps: String(bps),
      },
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: account.stripe_account_id },
        metadata: { kind: "tip", seller_user_id: account.user_id },
      },
      allow_promotion_codes: false,
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch {
    return NextResponse.json({ ok: false, error: "stripe_error" }, { status: 500 });
  }
}