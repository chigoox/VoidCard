import { NextResponse } from "next/server";
import { syncGoogleWalletPass } from "@/lib/wallet-google";
import { loadWalletProfile, rememberWalletPass } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorize(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const fromVercelCron = req.headers.get("x-vercel-cron") === "1";
  return fromVercelCron || (!!cronSecret && auth === `Bearer ${cronSecret}`);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  if (!authorize(req)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const { username } = await params;
  const profile = await loadWalletProfile(username);
  if (!profile) {
    return NextResponse.json({ error: "not_found", username }, { status: 404 });
  }

  const syncedPass = await syncGoogleWalletPass(profile);
  const lastSyncedAt = new Date().toISOString();
  await rememberWalletPass({
    userId: profile.userId,
    platform: "google",
    serial: syncedPass.serial,
    passUrl: syncedPass.saveUrl,
    walletObjectId: syncedPass.objectId,
    walletClassId: syncedPass.classId,
    lastSyncedAt,
  });

  return NextResponse.json(
    {
      ok: true,
      serial: syncedPass.serial,
      classId: syncedPass.classId,
      objectId: syncedPass.objectId,
      lastSyncedAt,
    },
    { status: 200 }
  );
}