import { NextResponse } from "next/server";
import { getSellerProductsByIds } from "@/lib/seller-products";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/seller/products?ids=uuid,uuid,... → public product info.
 * Returns only active products. RLS also enforces this server-side.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const idsParam = url.searchParams.get("ids") ?? "";
  const ids = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 24);

  if (ids.length === 0) return NextResponse.json({ ok: true, products: [] });

  const products = await getSellerProductsByIds(ids);
  // Strip owner-private fields.
  const stripped = products.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    image_url: p.image_url,
    image_urls: p.image_urls,
    variants: p.variants.filter((variant) => variant.active),
    price_cents: p.price_cents,
    currency: p.currency,
    shippable: p.shippable,
    inventory: p.inventory,
    digital: p.digital,
  }));
  return NextResponse.json({ ok: true, products: stripped });
}
