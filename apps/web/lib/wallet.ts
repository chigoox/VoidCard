import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { deflateSync } from "node:zlib";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRIMARY_PROFILE_ID, findPublicProfileByUsername, loadPrimaryProfile } from "@/lib/profiles";

export type WalletPlatform = "apple" | "google";

export type WalletProfile = {
  profileId: string;
  userId: string;
  username: string;
  displayName: string;
  bio: string | null;
  avatarUrl: string | null;
  verified: boolean;
  updatedAt: string | null;
};

export type WalletPassRecord = {
  id: string;
  userId: string;
  platform: WalletPlatform;
  serial: string;
  passUrl: string | null;
  registered: boolean;
  pushToken: string | null;
  deviceId: string | null;
  authToken: string | null;
  walletObjectId: string | null;
  walletClassId: string | null;
  lastSyncedAt: string | null;
  updatedAt: string;
};

type WalletPassRow = {
  id: string;
  user_id: string;
  platform: WalletPlatform;
  serial: string;
  pass_url: string | null;
  registered: boolean | null;
  push_token: string | null;
  device_id: string | null;
  auth_token: string | null;
  wallet_object_id: string | null;
  wallet_class_id: string | null;
  last_synced_at: string | null;
  updated_at: string;
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const CRC_TABLE = buildCrcTable();

function buildCrcTable() {
  return Array.from({ length: 256 }, (_, index) => {
    let c = index;
    for (let bit = 0; bit < 8; bit += 1) {
      c = (c & 1) === 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    return c >>> 0;
  });
}

function crc32(buffer: Buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, "ascii");
  const checksum = Buffer.alloc(4);
  checksum.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, checksum]);
}

function solidPng(width: number, height: number, rgba: [number, number, number, number]) {
  const rowLength = width * 4 + 1;
  const raw = Buffer.alloc(rowLength * height);

  for (let y = 0; y < height; y += 1) {
    const rowStart = y * rowLength;
    raw[rowStart] = 0;
    for (let x = 0; x < width; x += 1) {
      const offset = rowStart + 1 + x * 4;
      raw[offset] = rgba[0];
      raw[offset + 1] = rgba[1];
      raw[offset + 2] = rgba[2];
      raw[offset + 3] = rgba[3];
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export async function loadWalletProfile(username: string): Promise<WalletProfile | null> {
  const profile = await findPublicProfileByUsername(username);
  if (!profile?.username) return null;

  return {
    profileId: profile.id,
    userId: profile.ownerUserId,
    username: profile.username,
    displayName: profile.displayName?.trim() || `@${profile.username}`,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    verified: profile.verified === true,
    updatedAt: profile.updatedAt,
  };
}

export async function loadWalletProfileByUserId(userId: string): Promise<WalletProfile | null> {
  const profile = await loadPrimaryProfile(userId);
  if (!profile?.username || !profile.published) return null;

  return {
    profileId: PRIMARY_PROFILE_ID,
    userId: profile.ownerUserId,
    username: profile.username,
    displayName: profile.displayName?.trim() || `@${profile.username}`,
    bio: profile.bio,
    avatarUrl: profile.avatarUrl,
    verified: profile.verified === true,
    updatedAt: profile.updatedAt,
  };
}

export function walletSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vcard.ed5enterprise.com").replace(/\/+$/, "");
}

export function walletProfileUrl(username: string) {
  return `${walletSiteUrl()}/u/${encodeURIComponent(username)}`;
}

export function walletSerial(platform: WalletPlatform, profileKey: string) {
  return createHash("sha256").update(`${platform}:${profileKey}`).digest("hex").slice(0, 24);
}

export function walletObjectIdFragment(value: string) {
  const cleaned = value.toLowerCase().replace(/[^a-z0-9._-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "profile";
}

export function walletRegistrationToken() {
  return randomBytes(24).toString("hex");
}

export function walletLogoAssetBuffers() {
  return {
    icon: solidPng(120, 120, [212, 175, 55, 255]),
    icon2x: solidPng(240, 240, [212, 175, 55, 255]),
    logo: solidPng(320, 96, [10, 10, 11, 255]),
    logo2x: solidPng(640, 192, [10, 10, 11, 255]),
  };
}

export function walletSummary(profile: WalletProfile) {
  const lines = [
    profile.verified ? "Verified profile" : "Public profile",
    profile.bio?.trim() || "Scan to open the live profile.",
  ];
  return lines.filter(Boolean).join(" • ");
}

export function walletImageUrl(profile: WalletProfile) {
  return profile.avatarUrl || `${walletSiteUrl()}/icons/icon.svg`;
}

function mapWalletPassRow(row: WalletPassRow): WalletPassRecord {
  return {
    id: row.id,
    userId: row.user_id,
    platform: row.platform,
    serial: row.serial,
    passUrl: row.pass_url,
    registered: row.registered === true,
    pushToken: row.push_token,
    deviceId: row.device_id,
    authToken: row.auth_token,
    walletObjectId: row.wallet_object_id,
    walletClassId: row.wallet_class_id,
    lastSyncedAt: row.last_synced_at,
    updatedAt: row.updated_at,
  };
}

export async function loadWalletPass(platform: WalletPlatform, serial: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_wallet_passes")
    .select(
      "id, user_id, platform, serial, pass_url, registered, push_token, device_id, auth_token, wallet_object_id, wallet_class_id, last_synced_at, updated_at"
    )
    .eq("platform", platform)
    .eq("serial", serial)
    .maybeSingle();

  const row = (data as WalletPassRow | null) ?? null;
  return row ? mapWalletPassRow(row) : null;
}

export async function loadWalletPassForUser(platform: WalletPlatform, userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_wallet_passes")
    .select(
      "id, user_id, platform, serial, pass_url, registered, push_token, device_id, auth_token, wallet_object_id, wallet_class_id, last_synced_at, updated_at"
    )
    .eq("platform", platform)
    .eq("user_id", userId)
    .maybeSingle();

  const row = (data as WalletPassRow | null) ?? null;
  return row ? mapWalletPassRow(row) : null;
}

export async function syncWalletPassRegistrationState(passId: string) {
  const admin = createAdminClient();
  const { data: registrations } = await admin
    .from("vcard_wallet_registrations")
    .select("device_id, push_token")
    .eq("pass_id", passId)
    .order("updated_at", { ascending: false })
    .limit(1);

  const latest = ((registrations as Array<{ device_id: string; push_token: string }> | null) ?? [])[0] ?? null;
  await admin
    .from("vcard_wallet_passes")
    .update({
      registered: latest !== null,
      device_id: latest?.device_id ?? null,
      push_token: latest?.push_token ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", passId);
}

export async function rememberWalletPass(input: {
  userId: string;
  platform: WalletPlatform;
  serial: string;
  passUrl: string | null;
  authToken?: string | null;
  walletObjectId?: string | null;
  walletClassId?: string | null;
  registered?: boolean;
  pushToken?: string | null;
  deviceId?: string | null;
  lastSyncedAt?: string | null;
}) {
  try {
    const admin = createAdminClient();
    const payload: Record<string, unknown> = {
      user_id: input.userId,
      platform: input.platform,
      serial: input.serial,
      pass_url: input.passUrl,
      updated_at: new Date().toISOString(),
    };

    if (input.authToken !== undefined) payload.auth_token = input.authToken;
    if (input.walletObjectId !== undefined) payload.wallet_object_id = input.walletObjectId;
    if (input.walletClassId !== undefined) payload.wallet_class_id = input.walletClassId;
    if (input.registered !== undefined) payload.registered = input.registered;
    if (input.pushToken !== undefined) payload.push_token = input.pushToken;
    if (input.deviceId !== undefined) payload.device_id = input.deviceId;
    if (input.lastSyncedAt !== undefined) payload.last_synced_at = input.lastSyncedAt;

    await admin.from("vcard_wallet_passes").upsert(payload, { onConflict: "serial" });
  } catch (error) {
    console.warn("[wallet] unable to persist wallet pass row", error);
  }
}