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
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? "stripe_error" },
      { status: 500 },
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
  const url = await createOnboardingLink({
    accountId: existing.stripe_account_id,
    origin,
  });
  return NextResponse.redirect(url);
}
