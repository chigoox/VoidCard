import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { getUser } from "@/lib/auth";
import { getProductBySku, getPlan, getSetting } from "@/lib/cms";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Static fallback so checkout still works if migration 0025 hasn't been applied.
const PLAN_FALLBACK: Record<
  string,
  { name: string; cents: number; interval: "month" | "year" }
> = {
  pro: { name: "VoidCard Pro", cents: 499, interval: "month" },
  pro_year: { name: "VoidCard Pro (yearly)", cents: 4990, interval: "year" },
  team: { name: "VoidCard Team", cents: 1499, interval: "month" },
  team_year: { name: "VoidCard Team (yearly)", cents: 14990, interval: "year" },
};

const SHOP_FALLBACK: Record<
  string,
  { name: string; cents: number; currency: string; shippable: boolean }
> = {
  "card-pvc": { name: "PVC NFC Card", cents: 1900, currency: "usd", shippable: true },
  "card-metal": { name: "Metal NFC Card", cents: 2900, currency: "usd", shippable: true },
  "card-custom": { name: "Custom-Art NFC Card", cents: 4900, currency: "usd", shippable: true },
  "keychain": { name: "NFC Keychain", cents: 1500, currency: "usd", shippable: true },
  "stickers-5": { name: "NFC Sticker 5-pack", cents: 900, currency: "usd", shippable: true },
  "bundle-starter": { name: "Starter Bundle", cents: 3500, currency: "usd", shippable: true },
  "team-5pack": { name: "Team 5-pack", cents: 7900, currency: "usd", shippable: true },
  "card-replacement": { name: "Card Replacement", cents: 1500, currency: "usd", shippable: true },
  "verified-badge": { name: "Verified Badge", cents: 500, currency: "usd", shippable: false },
};

async function planLineItem(plan: string): Promise<Stripe.Checkout.SessionCreateParams.LineItem | null> {
  const isYear = plan.endsWith("_year");
  const baseId = plan.replace(/_year$/, "");
  const row = await getPlan(baseId);
  if (row) {
    const cents = isYear ? row.yearly_cents : row.monthly_cents;
    if (!cents || cents <= 0) return null;
    return {
      quantity: 1,
      price_data: {
        currency: "usd",
        unit_amount: cents,
        recurring: { interval: isYear ? "year" : "month" },
        product_data: {
          name: `${row.name}${isYear ? " (yearly)" : ""}`,
          metadata: { plan_id: row.id, billing: isYear ? "year" : "month" },
        },
      },
    };
  }
  const fb = PLAN_FALLBACK[plan];
  if (!fb) return null;
  return {
    quantity: 1,
    price_data: {
      currency: "usd",
      unit_amount: fb.cents,
      recurring: { interval: fb.interval },
      product_data: { name: fb.name, metadata: { plan_id: baseId, billing: fb.interval } },
    },
  };
}

async function shopLineItem(
  sku: string,
): Promise<{ item: Stripe.Checkout.SessionCreateParams.LineItem; shippable: boolean } | null> {
  const product = await getProductBySku(sku);
  if (product) {
    if (!product.price_cents || product.price_cents <= 0) return null;
    const meta = (product.metadata ?? {}) as Record<string, unknown>;
    const shippable = sku !== "verified-badge" && meta.shippable !== false;
    return {
      shippable,
      item: {
        quantity: 1,
        price_data: {
          currency: (product.currency || "usd").toLowerCase(),
          unit_amount: product.price_cents,
          product_data: {
            name: product.name,
            description: product.blurb ?? undefined,
            metadata: { sku: product.sku },
          },
        },
      },
    };
  }
  const fb = SHOP_FALLBACK[sku];
  if (!fb) return null;
  return {
    shippable: fb.shippable,
    item: {
      quantity: 1,
      price_data: {
        currency: fb.currency,
        unit_amount: fb.cents,
        product_data: { name: fb.name, metadata: { sku } },
      },
    },
  };
}

export async function POST(req: Request) {
  let body: { kind?: "shop" | "subscribe"; sku?: string; plan?: string; referral?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const u = await getUser();
  const origin =
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000";

  try {
    if (body.kind === "subscribe" && body.plan) {
      const item = await planLineItem(body.plan);
      if (!item) return NextResponse.json({ error: "unknown_plan" }, { status: 400 });
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        line_items: [item],
        success_url: `${origin}/dashboard?upgraded=1`,
        cancel_url: `${origin}/pricing`,
        customer_email: u?.email ?? undefined,
        client_reference_id: u?.id,
        metadata: { user_id: u?.id ?? "", plan: body.plan },
        allow_promotion_codes: true,
      });
      return NextResponse.json({ url: session.url });
    }

    if (body.kind === "shop" && body.sku) {
      const result = await shopLineItem(body.sku);
      if (!result) return NextResponse.json({ error: "unknown_sku" }, { status: 400 });
      const successUrl = body.sku === "verified-badge" ? `${origin}/account/verify?checkout=1` : `${origin}/shop?ok=1`;
      const cancelUrl = body.sku === "verified-badge" ? `${origin}/account/verify` : `${origin}/shop`;
      const allowedCountries =
        ((await getSetting<string[]>("shop.shipping_countries")) ?? ["US", "CA", "GB", "AU"]) as Array<
          "US" | "CA" | "GB" | "AU"
        >;
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        line_items: [result.item],
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: u?.email ?? undefined,
        client_reference_id: u?.id,
        metadata: {
          user_id: u?.id ?? "",
          sku: body.sku,
          referral_code: body.referral ?? "",
        },
        ...(result.shippable
          ? { shipping_address_collection: { allowed_countries: allowedCountries } }
          : {}),
        allow_promotion_codes: true,
      });
      return NextResponse.json({ url: session.url });
    }

    return NextResponse.json({ error: "invalid_kind" }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message || "stripe_error" },
      { status: 500 },
    );
  }
}
