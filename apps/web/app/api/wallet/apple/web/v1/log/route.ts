import { NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WalletLogSchema = z.object({
  logs: z.array(z.string().min(1).max(2000)).max(50).optional(),
});

export async function POST(req: Request) {
  const parsed = WalletLogSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  if ((parsed.data.logs?.length ?? 0) > 0) {
    console.warn("[wallet.apple.log]", parsed.data.logs);
  }

  return new NextResponse(null, { status: 200 });
}