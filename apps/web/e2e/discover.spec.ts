import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "./fixtures";

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

function adminClient() {
  if (!ENV) throw new Error("Supabase test environment is not configured.");
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function hasProfileSchema() {
  const admin = adminClient();
  const check = await admin.from("vcard_profile_ext").select("user_id").limit(1);
  return !check.error;
}

test("discover page and API return public profile matches", async ({ page, request }) => {
  test.slow();
  test.skip(!ENV, "Supabase env missing for discovery E2E.");

  if (!(await hasProfileSchema())) {
    test.skip(true, "Configured Supabase project is missing vcard_profile_ext.");
    return;
  }

  const admin = adminClient();
  const email = `discover-${randomUUID()}@voidcard-test.dev`;
  const password = `VoidCard-${randomUUID()}-A1!`;
  const username = `discover${randomUUID().replaceAll("-", "").slice(0, 10)}`;
  let userId: string | null = null;

  try {
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (created.error) throw created.error;
    userId = created.data.user?.id ?? null;
    if (!userId) throw new Error("Supabase did not return a user id.");

    const { error: profileError } = await admin.from("vcard_profile_ext").upsert(
      {
        user_id: userId,
        username,
        display_name: "Discover E2E",
        bio: "Book a demo, watch the reel, and tip after the show.",
        published: true,
        sections: [
          {
            id: randomUUID(),
            type: "schedule",
            visible: true,
            props: { provider: "calcom", url: "https://cal.com/discover-e2e" },
          },
          {
            id: randomUUID(),
            type: "tip",
            visible: true,
            props: { stripeAccountId: "acct_test", amounts: [200, 500] },
          },
        ],
      },
      { onConflict: "user_id" }
    );
    if (profileError) throw profileError;

    const apiResponse = await request.get(`/api/discover?q=${username}`);
    expect(apiResponse.status()).toBe(200);
    const body = await apiResponse.json();
    expect(Array.isArray(body.results)).toBe(true);
    expect(body.results[0]?.username).toBe(username);

    await page.goto(`/discover?q=${username}`);
    await expect(page.getByTestId(`discover-card-${username}`)).toContainText("Discover E2E");
    await expect(page.getByText("Bookings")).toBeVisible();
  } finally {
    if (userId) {
      await admin.auth.admin.deleteUser(userId);
    }
  }
});