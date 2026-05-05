import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "./fixtures";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000";
const ENV = loadTestEnv();

type TestEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
};

type UserSeed = {
  userId: string;
  username: string;
};

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
  const supabaseAnonKey = values.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = values.get("SUPABASE_SERVICE_ROLE_KEY") ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) return null;

  return { supabaseUrl, supabaseAnonKey, supabaseServiceRoleKey };
}

function adminClient() {
  if (!ENV) throw new Error("Supabase env missing for account feature tests.");
  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function hasVoidCardSchema() {
  const admin = adminClient();
  const checks = await Promise.all([
    admin.from("vcard_profile_ext").select("user_id").limit(1),
    admin.from("vcard_webhooks").select("id").limit(1),
    admin.from("vcard_profiles").select("id").limit(1),
  ]);
  return checks.every((check) => !check.error);
}

async function createSessionCookies(email: string, password: string) {
  if (!ENV) throw new Error("Supabase env missing for account feature tests.");

  const cookieJar = new Map<string, string>();
  const authClient = createServerClient(ENV.supabaseUrl, ENV.supabaseAnonKey, {
    cookies: {
      getAll() {
        return Array.from(cookieJar.entries(), ([name, value]) => ({ name, value }));
      },
      setAll(toSet: { name: string; value: string; options?: CookieOptions }[]) {
        for (const { name, value, options } of toSet) {
          if (options?.maxAge === 0 || value === "") cookieJar.delete(name);
          else cookieJar.set(name, value);
        }
      },
    },
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: false,
    },
  });

  const { data, error } = await authClient.auth.signInWithPassword({ email, password });
  if (error) throw error;
  if (!data.session) throw new Error("No Supabase session returned for test user.");

  return Array.from(cookieJar.entries(), ([name, value]) => ({ name, value }));
}

async function prepareUser(page: import("@playwright/test").Page): Promise<UserSeed> {
  const admin = adminClient();
  const password = `VoidCard-${randomUUID()}-A1!`;
  const email = `account-${randomUUID()}@voidcard-test.dev`;
  const username = `acct${randomUUID().replaceAll("-", "").slice(0, 12)}`;

  const createUser = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (createUser.error) throw createUser.error;

  const userId = createUser.data.user?.id ?? null;
  if (!userId) throw new Error("Supabase did not return a user id.");

  const { error: profileError } = await admin.from("vcard_profile_ext").upsert(
    {
      user_id: userId,
      username,
      display_name: "Account Features E2E",
      plan: "pro",
      verified: false,
      published: true,
      weekly_digest_enabled: true,
    },
    { onConflict: "user_id" },
  );
  if (profileError) throw profileError;

  const sessionCookies = await createSessionCookies(email, password);
  await page.context().addCookies(
    sessionCookies.map(({ name, value }) => ({
      name,
      value,
      url: BASE_URL,
      sameSite: "Lax" as const,
      secure: false,
    })),
  );

  await page.goto("/dashboard");
  await expect(page.getByTestId("dash-hero")).toBeVisible();
  return { userId, username };
}

async function cleanupUser(seed: UserSeed) {
  const admin = adminClient();
  const { data: testHooks } = await admin.from("vcard_webhooks").select("id").eq("user_id", seed.userId);
  const webhookIds = (testHooks ?? []).map((row) => row.id);

  if (webhookIds.length > 0) {
    await admin.from("vcard_webhook_deliveries").delete().in("webhook_id", webhookIds);
    await admin.from("vcard_webhooks").delete().in("id", webhookIds);
  }

  await Promise.all([
    admin.from("vcard_profiles").delete().eq("owner_user_id", seed.userId),
    admin.from("vcard_ab_variants").delete().eq("user_id", seed.userId),
    admin.from("vcard_user_fonts").delete().eq("user_id", seed.userId),
    admin.from("vcard_notifications").delete().eq("user_id", seed.userId),
    admin.from("vcard_taps").delete().eq("user_id", seed.userId),
    admin.from("vcard_profile_ext").delete().eq("user_id", seed.userId),
  ]);

  await admin.auth.admin.deleteUser(seed.userId);
}

async function lookupWebhookId(userId: string, url: string) {
  const admin = adminClient();
  const { data, error } = await admin
    .from("vcard_webhooks")
    .select("id")
    .eq("user_id", userId)
    .eq("url", url)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function lookupProfileId(userId: string, username: string) {
  const admin = adminClient();
  const { data, error } = await admin
    .from("vcard_profiles")
    .select("id")
    .eq("owner_user_id", userId)
    .eq("username", username)
    .maybeSingle();
  if (error) throw error;
  return data?.id ?? null;
}

async function readWeeklyDigestEnabled(userId: string) {
  const admin = adminClient();
  const { data, error } = await admin
    .from("vcard_profile_ext")
    .select("weekly_digest_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data?.weekly_digest_enabled ?? true;
}

test.describe("account features", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(!ENV, "Supabase env missing for account feature tests.");

  test("can save a theme preset in settings", async ({ page }) => {
    test.skip(!(await hasVoidCardSchema()), "Configured Supabase project is missing the VoidCard tables required for account feature E2E.");
    const seed = await prepareUser(page);
    try {
      await page.goto("/settings");
      await page.getByTestId("theme-rose-dusk").click();
      await expect(page.getByTestId("theme-rose-dusk")).toHaveAttribute("aria-pressed", "true");
      await page.getByTestId("settings-save").click();
      await expect(page.getByTestId("settings-message")).toHaveText("Saved.");
      await page.reload();
      await expect(page.getByTestId("theme-rose-dusk")).toHaveAttribute("aria-pressed", "true");
    } finally {
      await cleanupUser(seed);
    }
  });

  test("can create, enable, and delete an A/B variant", async ({ page }) => {
    test.skip(!(await hasVoidCardSchema()), "Configured Supabase project is missing the VoidCard tables required for account feature E2E.");
    const seed = await prepareUser(page);
    const variantName = `Hero ${randomUUID().slice(0, 8)}`;

    try {
      await page.goto("/variants");
      await page.getByTestId("variant-name-input").fill(variantName);
      await page.getByTestId("variant-weight-input").fill("35");
      await page.getByTestId("variant-create-submit").click();

      const row = page.locator("tbody tr").filter({ hasText: variantName });
      await expect(row).toHaveCount(1);
      await row.getByRole("button", { name: /enable/i }).click();
      await expect(row).toContainText("live");
      await row.getByRole("button", { name: /delete/i }).click();
      await expect(row).toHaveCount(0);
    } finally {
      await cleanupUser(seed);
    }
  });

  test("can upload and delete a custom font", async ({ page }) => {
    test.skip(!(await hasVoidCardSchema()), "Configured Supabase project is missing the VoidCard tables required for account feature E2E.");
    const seed = await prepareUser(page);
    const family = `E2E-${randomUUID().slice(0, 8)}`;

    try {
      await page.goto("/fonts");
      await page.getByTestId("font-family-input").fill(family);
      await page.getByTestId("font-weight-input").selectOption("600");
      await page.getByTestId("font-style-input").selectOption("normal");
      await page.getByTestId("font-file-input").setInputFiles({
        name: `${family}.woff2`,
        mimeType: "font/woff2",
        buffer: Buffer.from("voidcard-font-e2e"),
      });
      await page.getByTestId("font-create-submit").click();

      const row = page.locator("tbody tr").filter({ hasText: family });
      await expect(row).toHaveCount(1, { timeout: 20_000 });
      await expect(row).toContainText("active");
      await row.getByRole("button", { name: /delete/i }).click();
      await expect(row).toHaveCount(0);
    } finally {
      await cleanupUser(seed);
    }
  });

  test("can toggle weekly digest preference", async ({ page }) => {
    test.skip(!(await hasVoidCardSchema()), "Configured Supabase project is missing the VoidCard tables required for account feature E2E.");
    const seed = await prepareUser(page);

    try {
      await page.goto("/account/notifications");
      const expectedEnabled = false;
      await page.getByTestId("weekly-digest-toggle").click();
      await expect.poll(() => readWeeklyDigestEnabled(seed.userId)).toBe(expectedEnabled);
      await page.reload();
      await expect(page.getByTestId("weekly-digest-toggle")).toHaveText(expectedEnabled ? "Disable digest" : "Enable digest");
    } finally {
      await cleanupUser(seed);
    }
  });

  test("can create, toggle, and delete a webhook", async ({ page }) => {
    test.skip(!(await hasVoidCardSchema()), "Configured Supabase project is missing the VoidCard tables required for account feature E2E.");
    const seed = await prepareUser(page);
    const webhookUrl = `https://example.com/e2e-${randomUUID().slice(0, 8)}`;

    try {
      await page.goto("/account/api");
      await page.getByTestId("webhook-url-input").fill(webhookUrl);
      await page.getByTestId("webhook-create-submit").click();

      await expect.poll(() => lookupWebhookId(seed.userId, webhookUrl)).not.toBeNull();
      const webhookId = await lookupWebhookId(seed.userId, webhookUrl);
      if (!webhookId) throw new Error("Webhook was not created.");

      const row = page.getByTestId(`webhook-row-${webhookId}`);
      await expect(row).toBeVisible();

      await page.getByTestId(`webhook-toggle-${webhookId}`).click();
      await expect(row).toContainText("Disabled");

      await page.getByTestId(`webhook-toggle-${webhookId}`).click();
      await expect(row).toContainText("Active");

      await page.getByTestId(`webhook-delete-${webhookId}`).click();
      await expect(page.getByTestId(`webhook-row-${webhookId}`)).toHaveCount(0);
    } finally {
      await cleanupUser(seed);
    }
  });

  test("can create and delete an extra profile", async ({ page }) => {
    test.skip(!(await hasVoidCardSchema()), "Configured Supabase project is missing the VoidCard tables required for account feature E2E.");
    const seed = await prepareUser(page);
    const username = `e2e-${randomUUID().slice(0, 8)}`;

    try {
      await page.goto("/profiles");
      await page.getByTestId("profile-create-username").fill(username);
      await page.getByTestId("profile-create-display-name").fill("E2E Launch Profile");
      await page.getByTestId("profile-create-submit").click();

      await expect.poll(() => lookupProfileId(seed.userId, username)).not.toBeNull();
      const profileId = await lookupProfileId(seed.userId, username);
      if (!profileId) throw new Error("Extra profile was not created.");

      await expect(page.getByTestId(`profile-row-${profileId}`)).toBeVisible();
      await page.getByTestId(`profile-delete-${profileId}`).click();
      await expect(page.getByTestId(`profile-row-${profileId}`)).toHaveCount(0);
    } finally {
      await cleanupUser(seed);
    }
  });

  test("can protect and unlock the public profile", async ({ page, context }) => {
    test.skip(!(await hasVoidCardSchema()), "Configured Supabase project is missing the VoidCard tables required for account feature E2E.");
    const seed = await prepareUser(page);
    const password = `Voidcard-${randomUUID().slice(0, 8)}`;

    try {
      await page.goto("/settings");
      await page.getByTestId("settings-profile-password").fill(password);
      await page.getByTestId("settings-profile-password-save").click();
      await expect(page.getByTestId("settings-profile-password-message")).toHaveText("Profile password saved.");

      const publicPage = await context.newPage();
      await publicPage.goto(`/u/${seed.username}`);
      await expect(publicPage.getByTestId("profile-unlock-password")).toBeVisible();
      await publicPage.getByTestId("profile-unlock-password").fill(password);
      await publicPage.getByTestId("profile-unlock-submit").click();
      await expect(publicPage.getByTestId("profile-public-content")).toBeVisible();
      await expect(publicPage.getByTestId("profile-unlock-password")).toHaveCount(0);
      await publicPage.close();
    } finally {
      await cleanupUser(seed);
    }
  });
});
