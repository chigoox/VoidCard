import { NextResponse } from "next/server";
import { buildAppleWalletPass } from "@/lib/wallet-apple";
import {
  loadWalletPass,
  loadWalletProfile,
  rememberWalletPass,
  walletProfileUrl,
  walletRegistrationToken,
  walletSerial,
} from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: Request, { params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profile = await loadWalletProfile(username);
  if (!profile) {
    return NextResponse.json({ error: "not_found", username }, { status: 404 });
  }

  const serial = walletSerial("apple", `${profile.userId}:${profile.profileId}`);
  const profileUrl = walletProfileUrl(profile.username);
  const existingPass = await loadWalletPass("apple", serial);
  const authToken = existingPass?.authToken ?? walletRegistrationToken();

  let builtPass;
  try {
    builtPass = buildAppleWalletPass(profile, serial, authToken);
  } catch (error) {
    return NextResponse.json(
      {
        error: "wallet_unavailable",
        message: error instanceof Error ? error.message : "Apple Wallet pass generation is unavailable.",
        username,
      },
      { status: 501 }
    );
  }

  await rememberWalletPass({
    userId: profile.userId,
    platform: "apple",
    serial,
    passUrl: profileUrl,
    authToken,
    registered: existingPass?.registered ?? false,
    pushToken: existingPass?.pushToken,
    deviceId: existingPass?.deviceId,
  });

  return new NextResponse(new Uint8Array(builtPass.buffer), {
    status: 200,
    headers: {
      "content-type": builtPass.mimeType,
      "content-disposition": `attachment; filename="${profile.username}.pkpass"`,
      "cache-control": "no-store",
    },
  });
}
