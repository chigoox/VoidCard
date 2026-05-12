import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createDashboardLink, getSellerAccount } from "@/lib/stripe-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function dashboardError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();
  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "sk_test_dummy") {
    return {
      status: 503,
      error: "stripe_not_configured",
      message: "Stripe is not configured yet. Add STRIPE_SECRET_KEY, restart the app, then try again.",
    };
  }
  if (lower.includes("invalid api key") || lower.includes("api key provided")) {
    return {
      status: 503,
      error: "stripe_invalid_key",
      message: "Stripe rejected the configured API key. Check STRIPE_SECRET_KEY in your environment.",
    };
  }
  return {
    status: 500,
    error: "stripe_dashboard_error",
    message: "Could not open the Stripe dashboard. Check the server logs for the Stripe error, then try again.",
  };
}

/**
 * POST → returns { url } for an Express dashboard login link.
 */
export async function POST() {
  const u = await requireUser();
  const account = await getSellerAccount(u.id);
  if (!account) {
    return NextResponse.json({ ok: false, error: "not_connected" }, { status: 400 });
  }
  if (!account.details_submitted) {
    return NextResponse.json({ ok: false, error: "onboarding_incomplete" }, { status: 400 });
  }
  try {
    const url = await createDashboardLink(account.stripe_account_id);
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const setupError = dashboardError(err);
    return NextResponse.json(
      { ok: false, error: setupError.error, message: setupError.message },
      { status: setupError.status },
    );
  }
}
