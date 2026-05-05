import { NextResponse } from "next/server";
import { buildAppleWalletPass, configuredApplePassTypeIdentifier } from "@/lib/wallet-apple";
import { loadWalletPass, loadWalletProfileByUserId } from "@/lib/wallet";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function appleAuthToken(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "ApplePass" || !token) {
    return null;
  }
  return token.trim();
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ passTypeIdentifier: string; serial: string }> }
) {
  const { passTypeIdentifier, serial } = await params;
  const configuredPassTypeIdentifier = configuredApplePassTypeIdentifier();
  if (!configuredPassTypeIdentifier || configuredPassTypeIdentifier !== passTypeIdentifier) {
    return new NextResponse(null, { status: 404 });
  }

  const pass = await loadWalletPass("apple", serial);
  const token = appleAuthToken(req);
  if (!pass || !token || !pass.authToken || token !== pass.authToken) {
    return new NextResponse(null, { status: 401 });
  }

  const profile = await loadWalletProfileByUserId(pass.userId);
  if (!profile) {
    return new NextResponse(null, { status: 404 });
  }

  const builtPass = buildAppleWalletPass(profile, pass.serial, pass.authToken);
  return new NextResponse(new Uint8Array(builtPass.buffer), {
    status: 200,
    headers: {
      "content-type": builtPass.mimeType,
      "cache-control": "no-store",
    },
  });
}