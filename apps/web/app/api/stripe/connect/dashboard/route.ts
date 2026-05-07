import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { createDashboardLink, getSellerAccount } from "@/lib/stripe-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
    return NextResponse.json(
      { ok: false, error: (err as Error).message ?? "stripe_error" },
      { status: 500 },
    );
  }
}
