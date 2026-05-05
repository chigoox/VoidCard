import { NextResponse } from "next/server";
import { syncGoogleWalletPass } from "@/lib/wallet-google";
import {
  loadWalletProfile,
  rememberWalletPass,
} from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await loadWalletProfile(username);
  if (!profile) {
    return NextResponse.json({ error: "not_found", username }, { status: 404 });
  }

  let syncedPass;
  try {
    syncedPass = await syncGoogleWalletPass(profile);
  } catch (error) {
    return NextResponse.json(
      {
        error: "wallet_unavailable",
        message: error instanceof Error ? error.message : "Google Wallet save link is unavailable.",
        username,
      },
      { status: 501 }
    );
  }

  await rememberWalletPass({
    userId: profile.userId,
    platform: "google",
    serial: syncedPass.serial,
    passUrl: syncedPass.saveUrl,
    walletObjectId: syncedPass.objectId,
    walletClassId: syncedPass.classId,
    lastSyncedAt: new Date().toISOString(),
  });

  return NextResponse.redirect(syncedPass.saveUrl, {
    status: 302,
    headers: { "cache-control": "no-store" },
  });
}
