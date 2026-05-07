import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getBalance, grantMonthlyIfDue, getAiSettings } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await requireUser();
  const granted = await grantMonthlyIfDue(user.id, user.plan === "team" ? "team" : user.plan === "pro" ? "pro" : "free");
  const balance = await getBalance(user.id);
  const settings = await getAiSettings();
  return NextResponse.json({
    ok: true,
    balance: balance.balance,
    lifetimeGranted: balance.lifetimeGranted,
    lifetimeSpent: balance.lifetimeSpent,
    costPerImage: settings.costPerImage,
    monthlyJustGranted: granted,
  });
}
