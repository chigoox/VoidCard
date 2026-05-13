import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value).replace(/"/g, '""');
  return `"${str}"`;
}

export async function GET() {
  const u = await requireUser();
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_seller_orders")
    .select(
      "id,created_at,status,buyer_email,total_cents,application_fee_cents,currency,items,shipping_address,metadata,stripe_payment_intent",
    )
    .eq("seller_user_id", u.id)
    .order("created_at", { ascending: false })
    .limit(5000);

  const rows = data ?? [];
  const header = [
    "order_id",
    "created_at",
    "status",
    "buyer_email",
    "total",
    "revenue_share",
    "currency",
    "items",
    "tracking_number",
    "shipping_to",
    "stripe_payment_intent",
  ];

  const lines = [header.map(csvEscape).join(",")];
  for (const r of rows as Array<{
    id: string;
    created_at: string;
    status: string;
    buyer_email: string | null;
    total_cents: number;
    application_fee_cents: number;
    currency: string;
    items: Array<{ name?: string; quantity?: number }> | null;
    shipping_address: { name?: string; address?: { line1?: string; city?: string; country?: string } } | null;
    metadata: Record<string, unknown> | null;
    stripe_payment_intent: string | null;
  }>) {
    const items = Array.isArray(r.items) ? r.items : [];
    const itemsText = items.map((i) => `${i.quantity ?? 1}x ${i.name ?? ""}`).join("; ");
    const ship = r.shipping_address;
    const shipText = ship
      ? [ship.name, ship.address?.line1, ship.address?.city, ship.address?.country].filter(Boolean).join(", ")
      : "";
    const tracking = (r.metadata?.tracking_number as string | undefined) ?? "";
    lines.push(
      [
        r.id,
        r.created_at,
        r.status,
        r.buyer_email ?? "",
        (r.total_cents / 100).toFixed(2),
        (r.application_fee_cents / 100).toFixed(2),
        (r.currency || "usd").toUpperCase(),
        itemsText,
        tracking,
        shipText,
        r.stripe_payment_intent ?? "",
      ]
        .map(csvEscape)
        .join(","),
    );
  }

  const body = lines.join("\n");
  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="voidcard-orders-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
