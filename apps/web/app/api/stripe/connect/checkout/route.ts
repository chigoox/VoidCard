import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { applicationFeeFor, getPlatformFeeBps } from "@/lib/stripe-connect";
import { getSellerProduct } from "@/lib/seller-products";
import { loadPrimaryProfile } from "@/lib/profiles";
import { rateLimits } from "@/lib/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST { productId, variantId?, qty?, profileUsername? } → Stripe Checkout URL.
 * Creates a destination charge to the seller's connected account, with a
 * platform application fee.
 */
export async function POST(req: Request) {
  let body: { productId?: string; variantId?: string; qty?: number; profileUsername?: string } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_body" }, { status: 400 });
  }
  if (!body.productId) {
    return NextResponse.json({ ok: false, error: "missing_product" }, { status: 400 });
  }
  const qty = Math.max(1, Math.min(20, Math.floor(body.qty ?? 1)));

  const product = await getSellerProduct(body.productId);
  if (!product || !product.active) {
    return NextResponse.json({ ok: false, error: "unknown_product" }, { status: 404 });
  }
  if (product.inventory !== null && product.inventory <= 0) {
    return NextResponse.json({ ok: false, error: "out_of_stock" }, { status: 409 });
  }
  const variant = body.variantId ? product.variants.find((entry) => entry.id === body.variantId && entry.active) ?? null : null;
  if (body.variantId && !variant) {
    return NextResponse.json({ ok: false, error: "unknown_variant" }, { status: 404 });
  }
  if (variant?.inventory !== null && variant?.inventory !== undefined && variant.inventory <= 0) {
    return NextResponse.json({ ok: false, error: "out_of_stock" }, { status: 409 });
  }

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("vcard_seller_accounts")
    .select("stripe_account_id, charges_enabled, details_submitted")
    .eq("user_id", product.owner_user_id)
    .maybeSingle();
  if (!account || !account.stripe_account_id) {
    return NextResponse.json({ ok: false, error: "seller_not_connected" }, { status: 409 });
  }
  if (!account.charges_enabled) {
    return NextResponse.json({ ok: false, error: "seller_not_ready" }, { status: 409 });
  }

  // Look up seller's plan to compute platform fee tier.
  const sellerProfile = await loadPrimaryProfile(product.owner_user_id);
  const sellerPlan = sellerProfile?.plan ?? "free";
  const bps = await getPlatformFeeBps(sellerPlan);

  const buyer = await getUser();
  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  // Rate-limit by buyer (or IP fallback) to avoid checkout spam.
  const key = buyer?.id ?? req.headers.get("x-forwarded-for") ?? "anon";
  const rl = await rateLimits.publish.limit(`seller-checkout:${key}`);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const unitAmount = product.price_cents + (variant?.price_delta_cents ?? 0);
  if (unitAmount < 0) {
    return NextResponse.json({ ok: false, error: "invalid_variant_price" }, { status: 400 });
  }
  const fee = applicationFeeFor(unitAmount * qty, bps);
  const productImages = product.image_urls.length > 0 ? product.image_urls : product.image_url ? [product.image_url] : [];

  const successPath = body.profileUsername
    ? `/u/${encodeURIComponent(body.profileUsername)}?ok=1`
    : "/?ok=1";

  const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
    quantity: qty,
    price_data: {
      currency: (product.currency || "usd").toLowerCase(),
      unit_amount: unitAmount,
      product_data: {
        name: variant ? `${product.name} - ${variant.name}` : product.name,
        description: product.description ?? undefined,
        images: productImages.length > 0 ? productImages.slice(0, 8) : undefined,
        metadata: {
          product_id: product.id,
          seller_user_id: product.owner_user_id,
          variant_id: variant?.id ?? "",
          variant_name: variant?.name ?? "",
        },
      },
    },
  };

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items: [lineItem],
      success_url: `${origin}${successPath}`,
      cancel_url: body.profileUsername
        ? `${origin}/u/${encodeURIComponent(body.profileUsername)}`
        : `${origin}/`,
      customer_email: buyer?.email ?? undefined,
      client_reference_id: buyer?.id,
      metadata: {
        kind: "seller",
        product_id: product.id,
        variant_id: variant?.id ?? "",
        seller_user_id: product.owner_user_id,
        buyer_user_id: buyer?.id ?? "",
        platform_fee_bps: String(bps),
      },
      payment_intent_data: {
        application_fee_amount: fee,
        transfer_data: { destination: account.stripe_account_id },
        metadata: {
          kind: "seller",
          product_id: product.id,
          variant_id: variant?.id ?? "",
          seller_user_id: product.owner_user_id,
        },
      },
      ...(product.shippable
        ? {
            shipping_address_collection: {
              allowed_countries: ["US", "CA", "GB", "AU"],
            },
          }
        : {}),
      allow_promotion_codes: false,
    });
    return NextResponse.json({ ok: true, url: session.url });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? "stripe_error" },
      { status: 500 },
    );
  }
}
