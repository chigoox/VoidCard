import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { updateSellerRevenueShareBps } from "@/lib/stripe-connect";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  revenueShareBps: z.number().int().min(0).max(10000),
});

export async function POST(req: Request) {
  const user = await requireUser();
  const json = await req.json().catch(() => ({}));
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  try {
    const account = await updateSellerRevenueShareBps(user.id, parsed.data.revenueShareBps);
    if (!account) {
      return NextResponse.json({ ok: false, error: "not_connected" }, { status: 409 });
    }
    return NextResponse.json({ ok: true, revenueShareBps: account.revenue_share_bps });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error ?? "");
    if (message.toLowerCase().includes("revenue_share_bps")) {
      return NextResponse.json({ ok: false, error: "schema_missing" }, { status: 503 });
    }
    return NextResponse.json({ ok: false, error: "update_failed" }, { status: 500 });
  }
}