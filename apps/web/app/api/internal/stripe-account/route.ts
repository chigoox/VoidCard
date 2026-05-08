import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * GET /api/internal/stripe-account?uid=<supabase_user_id>
 *
 * Service-to-service lookup for cross-app Stripe Connect unification.
 * Auth: Authorization: Bearer ${ED5_SERVICE_SECRET}
 *
 * Returns the user's Stripe Connect account id (or null) so that sister
 * apps in the ED5 ecosystem (e.g. Boox) can reuse the same `acct_xxx`
 * rather than creating duplicates per user.
 */
export async function GET(req: Request) {
  const secret = process.env.ED5_SERVICE_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "service_not_configured" }, { status: 500 });
  }
  const authHeader = req.headers.get("authorization") || "";
  const presented = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!presented || presented !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  if (!uid) return NextResponse.json({ error: "missing_uid" }, { status: 400 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_seller_accounts")
    .select("stripe_account_id, country, charges_enabled, payouts_enabled, details_submitted")
    .eq("user_id", uid)
    .maybeSingle();

  if (!data) return NextResponse.json({ stripeAccountId: null });

  return NextResponse.json({
    stripeAccountId: data.stripe_account_id,
    country: data.country,
    chargesEnabled: data.charges_enabled,
    payoutsEnabled: data.payouts_enabled,
    detailsSubmitted: data.details_submitted,
  });
}
