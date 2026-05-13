import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { expect, test } from "./fixtures";
import { detectPrimaryProfileSource, seedPrimaryProfile } from "./profile-seed";

type TestEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
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
  const supabaseAnonKey = values.get("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const supabaseServiceRoleKey = values.get("SUPABASE_SERVICE_ROLE_KEY") ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) return null;

  return {
    supabaseUrl,
    supabaseAnonKey,
    supabaseServiceRoleKey,
  };
}

function createAdminClientOrThrow() {
  if (!ENV) throw new Error("Supabase test environment is not configured.");

  return createClient(ENV.supabaseUrl, ENV.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function hasVoidCardSchema() {
  const admin = createAdminClientOrThrow();
  const source = await detectPrimaryProfileSource(admin);
  const [cardsCheck] = await Promise.all([
    admin.from("vcard_cards").select("id").limit(1),
  ]);

  return !!source && !cardsCheck.error;
}

async function createSessionCookies(email: string, password: string) {
  if (!ENV) throw new Error("Supabase test environment is not configured.");

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

test("admin can see owner identity, reactivate a card, and delete a card", async ({ page }) => {
  test.skip(!ENV, "Supabase env missing for admin cards E2E.");

  if (!(await hasVoidCardSchema())) {
    test.skip(true, "Configured Supabase project is missing the VoidCard tables required for admin cards E2E.");
    return;
  }

  const admin = createAdminClientOrThrow();
  const adminPassword = `VoidCard-${randomUUID()}-A1!`;
  const adminEmail = `admin-cards-${randomUUID()}@voidcard-test.dev`;
  const adminUsername = `admin${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const ownerPassword = `VoidCard-${randomUUID()}-A1!`;
  const ownerEmail = `owner-${randomUUID()}@voidcard-test.dev`;
  const ownerUsername = `owner${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const ownerDisplayName = "Managed Card Owner";
  const lostCardId = randomUUID();
  const deleteCardId = randomUUID();
  const lostCardSerial = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  const deleteCardSerial = randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase();
  let adminUserId: string | null = null;
  let ownerUserId: string | null = null;

  try {
    const adminCreate = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });
    if (adminCreate.error) throw adminCreate.error;
    adminUserId = adminCreate.data.user?.id ?? null;
    if (!adminUserId) throw new Error("Supabase did not return an admin user id.");

    const ownerCreate = await admin.auth.admin.createUser({
      email: ownerEmail,
      password: ownerPassword,
      email_confirm: true,
    });
    if (ownerCreate.error) throw ownerCreate.error;
    ownerUserId = ownerCreate.data.user?.id ?? null;
    if (!ownerUserId) throw new Error("Supabase did not return an owner user id.");

    await seedPrimaryProfile(admin, {
      userId: adminUserId,
      email: adminEmail,
      username: adminUsername,
      displayName: "Admin Cards E2E",
      published: true,
    });
    await seedPrimaryProfile(admin, {
      userId: ownerUserId,
      email: ownerEmail,
      username: ownerUsername,
      displayName: ownerDisplayName,
      published: true,
    });

    const { error: promoteError } = await admin
      .from("profiles")
      .update({ role: "superadmin" })
      .eq("id", adminUserId);
    if (promoteError) throw promoteError;

    const now = new Date().toISOString();
    const { error: cardsError } = await admin.from("vcard_cards").insert([
      {
        id: lostCardId,
        serial: lostCardSerial,
        sku: "card-pvc",
        user_id: ownerUserId,
        status: "lost",
        paired_at: now,
        total_taps: 3,
      },
      {
        id: deleteCardId,
        serial: deleteCardSerial,
        sku: "card-metal",
        user_id: ownerUserId,
        status: "active",
        paired_at: now,
        total_taps: 1,
      },
    ]);
    if (cardsError) throw cardsError;

    const sessionCookies = await createSessionCookies(adminEmail, adminPassword);
    await page.context().addCookies(
      sessionCookies.map(({ name, value }) => ({
        name,
        value,
        url: BASE_URL,
        sameSite: "Lax" as const,
        secure: false,
      })),
    );

    await page.goto(`/admin/cards?user=${ownerUserId}`);
    await expect(page.getByRole("heading", { name: /cards/i })).toBeVisible();
    await expect(page.getByRole("link", { name: new RegExp(ownerDisplayName, "i") }).first()).toBeVisible();
    await expect(page.getByText(`@${ownerUsername}`).first()).toBeVisible();

    await page.getByTestId(`admin-card-toggle-${lostCardId}`).click();

    await expect.poll(async () => {
      const { data } = await admin.from("vcard_cards").select("status").eq("id", lostCardId).maybeSingle();
      return data?.status ?? null;
    }, { timeout: 15_000 }).toBe("active");

    await page.reload();
    await expect(page.getByTestId(`admin-card-toggle-${lostCardId}`)).toHaveText(/disable/i);

    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });
    await page.getByTestId(`admin-card-delete-${deleteCardId}`).click();

    await expect.poll(async () => {
      const { data } = await admin.from("vcard_cards").select("id").eq("id", deleteCardId).maybeSingle();
      return data?.id ?? null;
    }, { timeout: 15_000 }).toBe(null);

    await page.reload();
    await expect(page.getByTestId(`admin-card-delete-${deleteCardId}`)).toHaveCount(0);
  } finally {
    await admin.from("vcard_cards").delete().in("id", [lostCardId, deleteCardId]);

    if (ownerUserId) {
      await admin.from("profiles").delete().eq("id", ownerUserId);
      await admin.auth.admin.deleteUser(ownerUserId);
    }
    if (adminUserId) {
      await admin.from("profiles").delete().eq("id", adminUserId);
      await admin.auth.admin.deleteUser(adminUserId);
    }
  }
});