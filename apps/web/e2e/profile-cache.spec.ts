import { test, expect } from "./fixtures";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { seedPrimaryProfile } from "./profile-seed";

const username = process.env.E2E_PUBLIC_USERNAME ?? "voidluxury";

type TestEnv = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
};

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

test("public profile responses are not cacheable", async ({ request }) => {
  const response = await request.get(`/u/${username}`);
  if (response.status() === 404) test.skip(true, `profile @${username} not seeded`);

  const cacheControl = (response.headers()["cache-control"] ?? "").toLowerCase();
  expect(cacheControl).toContain("no-cache");
  expect(cacheControl).toContain("must-revalidate");
});

test("card tap redirect responses are no-store", async ({ request }) => {
  test.skip(!ENV, "Supabase env missing for tap redirect cache E2E.");

  const admin = createAdminClientOrThrow();
  const email = `tap-cache-${randomUUID()}@voidcard-test.dev`;
  const password = `VoidCard-${randomUUID()}-A1!`;
  const username = `tapcache${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  const cardId = randomUUID();
  const serial = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  let userId: string | null = null;

  try {
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    userId = created.data.user?.id ?? null;
    if (!userId) throw new Error("Supabase did not return a user id.");

    await seedPrimaryProfile(admin, {
      userId,
      email,
      username,
      displayName: "Tap Cache E2E",
      published: true,
    });

    const now = new Date().toISOString();
    const { error: cardError } = await admin.from("vcard_cards").insert({
      id: cardId,
      serial,
      sku: "card-pvc",
      user_id: userId,
      status: "active",
      paired_at: now,
      total_taps: 0,
    });
    if (cardError) throw cardError;

    const response = await request.get(`/c/${cardId}`, { maxRedirects: 0 });
    expect(response.status()).toBeGreaterThanOrEqual(300);
    expect(response.status()).toBeLessThan(400);

    const cacheControl = (response.headers()["cache-control"] ?? "").toLowerCase();
    expect(cacheControl).toContain("no-store");
  } finally {
    await admin.from("vcard_cards").delete().eq("id", cardId);
    if (userId) {
      await admin.from("profiles").delete().eq("id", userId);
      await admin.from("vcard_profile_ext").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }
});
