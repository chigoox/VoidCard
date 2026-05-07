import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Disconnects the seller's Stripe Express account from VoidCard. We don't
 * delete the underlying Stripe account (the seller can still log in directly
 * at stripe.com); we only remove the link in our DB and disable selling.
 *
 * Any unfulfilled orders are preserved.
 */
export async function POST() {
  const u = await requireUser();
  const admin = createAdminClient();

  await admin
    .from("vcard_seller_accounts")
    .update({
      charges_enabled: false,
      payouts_enabled: false,
      details_submitted: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", u.id);

  // Deactivate all listed products so the public store can't sell.
  await admin
    .from("vcard_seller_products")
    .update({ active: false })
    .eq("owner_user_id", u.id);

  return NextResponse.json({ ok: true });
}
