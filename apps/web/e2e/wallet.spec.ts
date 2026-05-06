import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "./fixtures";
import { detectPrimaryProfileSource, seedPrimaryProfile } from "./profile-seed";

type TestEnv = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
};

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const ENV = loadTestEnv();

function loadTestEnv(): TestEnv | null {
  const envPath = resolve(process.cwd(), ".env.local");
  if (!existsSync(envPath)) return null;

  const values = new Map<string, string>();
  for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;

    const equalsIndex = line.indexOf("=");
    if (equalsIndex < 0) continue;

    const key = line.slice(0, equalsIndex).trim();
    let value = line.slice(equalsIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values.set(key, value);
  }

  const supabaseUrl = values.get("NEXT_PUBLIC_SUPABASE_URL") ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = values.get("SUPABASE_SERVICE_ROLE_KEY") ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseServiceRoleKey) return null;

  return { supabaseUrl, supabaseServiceRoleKey };
}

function createAdminClientOrThrow() {
  if (!ENV) throw new Error("Supabase test environment is not configured.");
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function hasWalletSchema() {
  const admin = createAdminClientOrThrow();
  const source = await detectPrimaryProfileSource(admin);
  const [walletCheck, registrationCheck] = await Promise.all([
    admin.from("vcard_wallet_passes").select("id, auth_token").limit(1),
    admin.from("vcard_wallet_registrations").select("id").limit(1),
  ]);
  return !!source && !walletCheck.error && !registrationCheck.error;
}

test("wallet routes expose either live passes or setup errors", async ({ request }) => {
  test.slow();
  test.skip(!ENV, "Supabase env missing for wallet E2E.");

  if (!(await hasWalletSchema())) {
    test.skip(true, "Configured Supabase project is missing the VoidCard tables required for wallet E2E.");
    return;
  }

  const admin = createAdminClientOrThrow();
  const email = `wallet-${randomUUID()}@voidcard-test.dev`;
  const password = `VoidCard-${randomUUID()}-A1!`;
  const username = `wallet${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  let userId: string | null = null;

  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user?.id ?? null;
    if (!userId) throw new Error("Supabase did not return a user id.");

    await seedPrimaryProfile(admin, {
      userId,
      email,
      username,
      displayName: "Wallet Route E2E",
      bio: "Wallet delivery route coverage.",
      plan: "free",
      published: true,
    });

    const appleResponse = await request.get(`/api/wallet/apple/${username}`);
    if (process.env.APPLE_PASS_TYPE_ID && process.env.APPLE_PASS_TEAM_ID && process.env.APPLE_PASS_CERT && process.env.APPLE_PASS_KEY && process.env.APPLE_WWDR) {
      expect(appleResponse.status()).toBe(200);
      expect(appleResponse.headers()["content-type"] ?? "").toContain("application/vnd.apple.pkpass");
    } else {
      expect(appleResponse.status()).toBe(501);
      const body = await appleResponse.json();
      expect(body.error).toBe("wallet_unavailable");
    }

    const googleResponse = await request.get(`/api/wallet/google/${username}`, { maxRedirects: 0 });
    if (process.env.GOOGLE_WALLET_ISSUER_ID && (process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_WALLET_SA_KEY)) {
      expect(googleResponse.status()).toBe(302);
      expect(googleResponse.headers()["location"] ?? "").toContain("https://pay.google.com/gp/v/save/");
    } else {
      expect(googleResponse.status()).toBe(501);
      const body = await googleResponse.json();
      expect(body.error).toBe("wallet_unavailable");
    }
  } finally {
    if (userId) {
      await admin.from("vcard_wallet_passes").delete().eq("user_id", userId);
      await admin.from("vcard_wallet_registrations").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }
});

test("apple web service registration updates stored pass state", async ({ request }) => {
  test.slow();
  test.skip(!ENV, "Supabase env missing for wallet E2E.");
  test.skip(!process.env.APPLE_PASS_TYPE_ID, "APPLE_PASS_TYPE_ID missing for Apple web-service E2E.");

  if (!(await hasWalletSchema())) {
    test.skip(true, "Configured Supabase project is missing the VoidCard tables required for wallet E2E.");
    return;
  }

  const admin = createAdminClientOrThrow();
  const email = `wallet-web-${randomUUID()}@voidcard-test.dev`;
  const password = `VoidCard-${randomUUID()}-A1!`;
  const username = `walletweb${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const deviceId = `device-${randomUUID().slice(0, 8)}`;
  const pushToken = `push-${randomUUID().replaceAll("-", "")}`;
  const serial = randomUUID().replaceAll("-", "").slice(0, 24);
  const authToken = randomUUID().replaceAll("-", "");
  let userId: string | null = null;

  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user?.id ?? null;
    if (!userId) throw new Error("Supabase did not return a user id.");

    await seedPrimaryProfile(admin, {
      userId,
      email,
      username,
      displayName: "Wallet Web E2E",
      bio: "Wallet web service route coverage.",
      plan: "free",
      published: true,
    });

    const { error: passError } = await admin.from("vcard_wallet_passes").insert({
      user_id: userId,
      platform: "apple",
      serial,
      pass_url: `${BASE_URL}/u/${username}`,
      auth_token: authToken,
      registered: false,
    });
    if (passError) throw passError;

    const registerResponse = await request.post(
      `/api/wallet/apple/web/v1/devices/${deviceId}/registrations/${process.env.APPLE_PASS_TYPE_ID}/${serial}`,
      {
        headers: {
          authorization: `ApplePass ${authToken}`,
          "content-type": "application/json",
        },
        data: { pushToken },
      }
    );
    expect(registerResponse.status()).toBe(201);

    await expect.poll(async () => {
      const result = await admin
        .from("vcard_wallet_passes")
        .select("registered, device_id, push_token")
        .eq("user_id", userId!)
        .eq("platform", "apple")
        .maybeSingle();
      if (result.error || !result.data) return false;
      return (
        result.data.registered === true &&
        result.data.device_id === deviceId &&
        result.data.push_token === pushToken
      );
    }, { timeout: 15_000 }).toBe(true);

    const listResponse = await request.get(
      `/api/wallet/apple/web/v1/devices/${deviceId}/registrations/${process.env.APPLE_PASS_TYPE_ID}?passesUpdatedSince=${encodeURIComponent(new Date(0).toISOString())}`
    );
    expect(listResponse.status()).toBe(200);
    const listBody = await listResponse.json();
    expect(Array.isArray(listBody.serialNumbers)).toBe(true);
    expect(listBody.serialNumbers).toContain(serial);

    const unregisterResponse = await request.delete(
      `/api/wallet/apple/web/v1/devices/${deviceId}/registrations/${process.env.APPLE_PASS_TYPE_ID}/${serial}`,
      {
        headers: {
          authorization: `ApplePass ${authToken}`,
        },
      }
    );
    expect(unregisterResponse.status()).toBe(200);

    await expect.poll(async () => {
      const result = await admin
        .from("vcard_wallet_passes")
        .select("registered, device_id, push_token")
        .eq("user_id", userId!)
        .eq("platform", "apple")
        .maybeSingle();
      if (result.error || !result.data) return false;
      return (
        result.data.registered === false &&
        result.data.device_id === null &&
        result.data.push_token === null
      );
    }, { timeout: 15_000 }).toBe(true);
  } finally {
    if (userId) {
      await admin.from("vcard_wallet_registrations").delete().eq("user_id", userId);
      await admin.from("vcard_wallet_passes").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }
});