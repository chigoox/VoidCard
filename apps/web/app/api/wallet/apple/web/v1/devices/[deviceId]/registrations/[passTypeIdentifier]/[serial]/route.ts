import { NextResponse } from "next/server";
import { z } from "zod";
import { configuredApplePassTypeIdentifier } from "@/lib/wallet-apple";
import {
  loadWalletPass,
  syncWalletPassRegistrationState,
} from "@/lib/wallet";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RegistrationBodySchema = z.object({
  pushToken: z.string().trim().min(1).max(500),
});

function appleAuthToken(req: Request) {
  const authorization = req.headers.get("authorization") ?? "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "ApplePass" || !token) {
    return null;
  }
  return token.trim();
}

async function authorizedPass(req: Request, passTypeIdentifier: string, serial: string) {
  const configuredPassTypeIdentifier = configuredApplePassTypeIdentifier();
  if (!configuredPassTypeIdentifier || configuredPassTypeIdentifier !== passTypeIdentifier) {
    return { error: new NextResponse(null, { status: 404 }) };
  }

  const pass = await loadWalletPass("apple", serial);
  const token = appleAuthToken(req);
  if (!pass || !token || !pass.authToken || token !== pass.authToken) {
    return { error: new NextResponse(null, { status: 401 }) };
  }

  return { pass };
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ deviceId: string; passTypeIdentifier: string; serial: string }> }
) {
  const { deviceId, passTypeIdentifier, serial } = await params;
  const authorized = await authorizedPass(req, passTypeIdentifier, serial);
  if (authorized.error) {
    return authorized.error;
  }

  const body = RegistrationBodySchema.safeParse(await req.json().catch(() => null));
  if (!body.success) {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { error } = await admin.from("vcard_wallet_registrations").upsert(
    {
      pass_id: authorized.pass.id,
      user_id: authorized.pass.userId,
      device_id: deviceId,
      push_token: body.data.pushToken,
    },
    { onConflict: "pass_id,device_id" }
  );
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await syncWalletPassRegistrationState(authorized.pass.id);
  return new NextResponse(null, { status: 201 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ deviceId: string; passTypeIdentifier: string; serial: string }> }
) {
  const { deviceId, passTypeIdentifier, serial } = await params;
  const authorized = await authorizedPass(req, passTypeIdentifier, serial);
  if (authorized.error) {
    return authorized.error;
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("vcard_wallet_registrations")
    .delete()
    .eq("pass_id", authorized.pass.id)
    .eq("device_id", deviceId);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await syncWalletPassRegistrationState(authorized.pass.id);
  return new NextResponse(null, { status: 200 });
}