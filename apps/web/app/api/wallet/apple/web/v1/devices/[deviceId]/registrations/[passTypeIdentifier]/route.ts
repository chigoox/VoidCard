import { NextResponse } from "next/server";
import { configuredApplePassTypeIdentifier } from "@/lib/wallet-apple";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type WalletRegistrationRow = {
  pass_id: string;
};

type WalletPassRow = {
  id: string;
  serial: string;
  user_id: string;
  updated_at: string;
};

type WalletProfileRow = {
  user_id: string;
  updated_at: string | null;
};

function isMissingTableError(error: { message?: string | null; code?: string | null } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST205" || message.includes("schema cache") || message.includes("could not find the table");
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ deviceId: string; passTypeIdentifier: string }> }
) {
  const { deviceId, passTypeIdentifier } = await params;
  const configuredPassTypeIdentifier = configuredApplePassTypeIdentifier();
  if (!configuredPassTypeIdentifier || configuredPassTypeIdentifier !== passTypeIdentifier) {
    return new NextResponse(null, { status: 404 });
  }

  const admin = createAdminClient();
  const { data: registrations, error: registrationError } = await admin
    .from("vcard_wallet_registrations")
    .select("pass_id")
    .eq("device_id", deviceId);
  if (registrationError) {
    return NextResponse.json({ error: registrationError.message }, { status: 500 });
  }

  const passIds = Array.from(
    new Set(((registrations as WalletRegistrationRow[] | null) ?? []).map((registration) => registration.pass_id))
  );
  if (passIds.length === 0) {
    return NextResponse.json(
      { serialNumbers: [] as string[], lastUpdated: new Date(0).toISOString() },
      { status: 200 }
    );
  }

  const { data: passes, error: passError } = await admin
    .from("vcard_wallet_passes")
    .select("id, serial, user_id, updated_at")
    .eq("platform", "apple")
    .in("id", passIds);
  if (passError) {
    return NextResponse.json({ error: passError.message }, { status: 500 });
  }

  const walletPasses = (passes as WalletPassRow[] | null) ?? [];
  const userIds = Array.from(new Set(walletPasses.map((pass) => pass.user_id)));
  let profiles: WalletProfileRow[] | null = [];
  let profileError: { message?: string | null; code?: string | null } | null = null;

  if (userIds.length) {
    const profileResult = await admin.from("vcard_profile_ext").select("user_id, updated_at").in("user_id", userIds);
    if (isMissingTableError(profileResult.error)) {
      const sharedResult = await admin.from("profiles").select("id, created_at").in("id", userIds);
      profileError = sharedResult.error;
      profiles = (((sharedResult.data as Array<{ id: string; created_at: string | null }> | null) ?? [])
        .map((profile) => ({ user_id: profile.id, updated_at: profile.created_at })));
    } else {
      profileError = profileResult.error;
      profiles = (profileResult.data as WalletProfileRow[] | null) ?? [];
    }
  }

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 });
  }

  const profileByUserId = new Map(
    (profiles ?? []).map((profile) => [profile.user_id, profile.updated_at])
  );
  const updatedSinceRaw = new URL(req.url).searchParams.get("passesUpdatedSince");
  const updatedSince = updatedSinceRaw ? Date.parse(updatedSinceRaw) : Number.NaN;

  const passUpdates = walletPasses.map((pass) => {
    const profileUpdatedAt = profileByUserId.get(pass.user_id);
    const latestUpdatedAt = new Date(
      Math.max(
        Date.parse(pass.updated_at),
        profileUpdatedAt ? Date.parse(profileUpdatedAt) : 0
      )
    );
    return {
      serial: pass.serial,
      updatedAt: latestUpdatedAt,
    };
  });

  const serialNumbers = Number.isNaN(updatedSince)
    ? passUpdates.map((pass) => pass.serial)
    : passUpdates.filter((pass) => pass.updatedAt.getTime() > updatedSince).map((pass) => pass.serial);

  const lastUpdated = passUpdates.reduce(
    (latest, pass) => (pass.updatedAt.toISOString() > latest ? pass.updatedAt.toISOString() : latest),
    new Date(0).toISOString()
  );

  return NextResponse.json({ serialNumbers, lastUpdated }, { status: 200 });
}