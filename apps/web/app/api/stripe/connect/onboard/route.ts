import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  createOnboardingLink,
  getOrCreateExpressAccount,
  getSellerAccount,
} from "@/lib/stripe-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function originFrom(req: Request): string {
  return (
    req.headers.get("origin") ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    "http://localhost:3000"
  );
}

function stripeConnectSetupError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  if (!process.env.STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY === "sk_test_dummy") {
    return {
      status: 503,
      error: "stripe_not_configured",
      message: "Stripe Connect is not configured yet. Add STRIPE_SECRET_KEY to apps/web/.env.local or Vercel, then restart the app.",
    };
  }

  if (lower.includes("invalid api key") || lower.includes("api key provided")) {
    return {
      status: 503,
      error: "stripe_invalid_key",
      message: "Stripe rejected the configured API key. Check STRIPE_SECRET_KEY and make sure it belongs to the Stripe account that owns this Connect platform.",
    };
  }

  if (lower.includes("vcard_seller_accounts") || lower.includes("schema cache") || lower.includes("could not find the table")) {
    return {
      status: 503,
      error: "seller_accounts_table_missing",
      message: "Seller payments are not set up in this database yet. Apply Supabase migration 0042_vcard_seller.sql, then refresh the schema cache.",
    };
  }

  if (lower.includes("connect") && lower.includes("not enabled")) {
    return {
      status: 503,
      error: "stripe_connect_not_enabled",
      message: "Stripe Connect is not enabled on this Stripe account yet. Enable Connect in the Stripe Dashboard, then try again.",
    };
  }

  return {
    status: 500,
    error: "stripe_connect_error",
    message: "Could not open Stripe onboarding. Check the server logs for the Stripe error, then try again.",
  };
}

/**
 * POST → returns { url } for the user to redirect into Stripe Connect onboarding.
 * Creates an Express account on first call.
 */
export async function POST(req: Request) {
  const u = await requireUser();
  const origin = originFrom(req);
  let body: { country?: string } = {};
  try {
    body = (await req.json()) as { country?: string };
  } catch {
    body = {};
  }
  try {
    const account = await getOrCreateExpressAccount({
      userId: u.id,
      email: u.email,
      country: body.country,
    });
    const url = await createOnboardingLink({
      accountId: account.stripe_account_id,
      origin,
    });
    return NextResponse.json({ ok: true, url });
  } catch (err) {
    const setupError = stripeConnectSetupError(err);
    return NextResponse.json(
      { ok: false, error: setupError.error, message: setupError.message },
      { status: setupError.status },
    );
  }
}

/**
 * GET (used as Stripe `refresh_url`) → re-issue an onboarding link and redirect.
 */
export async function GET(req: Request) {
  const u = await requireUser();
  const origin = originFrom(req);
  const existing = await getSellerAccount(u.id);
  if (!existing) {
    return NextResponse.redirect(`${origin}/account/payments`);
  }
  try {
    const url = await createOnboardingLink({
      accountId: existing.stripe_account_id,
      origin,
    });
    return NextResponse.redirect(url);
  } catch (err) {
    const setupError = stripeConnectSetupError(err);
    return NextResponse.redirect(`${origin}/account/payments?stripe_error=${setupError.error}`);
  }
}
