import { NextResponse } from "next/server";
import { deliverDueWebhookEvents } from "@/lib/webhook-delivery";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const fromVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!fromVercelCron && (!cronSecret || auth !== `Bearer ${cronSecret}`)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const result = await deliverDueWebhookEvents({ limit: 100 });
  return NextResponse.json({ ok: true, ...result });
}