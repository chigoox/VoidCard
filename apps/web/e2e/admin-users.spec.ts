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
  const [verificationCheck] = await Promise.all([
    admin.from("vcard_verifications").select("id").limit(1),
  ]);

  return !!source && !verificationCheck.error;
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

test("admin can update user role and verification state", async ({ page }) => {
  test.skip(!ENV, "Supabase env missing for admin users E2E.");

  if (!(await hasVoidCardSchema())) {
    test.skip(true, "Configured Supabase project is missing the VoidCard tables required for admin users E2E.");
    return;
  }

  const admin = createAdminClientOrThrow();
  const adminPassword = `VoidCard-${randomUUID()}-A1!`;
  const adminEmail = `admin-${randomUUID()}@voidcard-test.dev`;
  const adminUsername = `admin${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const targetPassword = `VoidCard-${randomUUID()}-A1!`;
  const targetEmail = `user-${randomUUID()}@voidcard-test.dev`;
  const targetUsername = `user${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  let adminUserId: string | null = null;
  let targetUserId: string | null = null;

  try {
    const adminCreate = await admin.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
    });
    if (adminCreate.error) throw adminCreate.error;
    adminUserId = adminCreate.data.user?.id ?? null;
    if (!adminUserId) throw new Error("Supabase did not return an admin user id.");

    const targetCreate = await admin.auth.admin.createUser({
      email: targetEmail,
      password: targetPassword,
      email_confirm: true,
    });
    if (targetCreate.error) throw targetCreate.error;
    targetUserId = targetCreate.data.user?.id ?? null;
    if (!targetUserId) throw new Error("Supabase did not return a target user id.");

    await seedPrimaryProfile(admin, {
      userId: adminUserId,
      email: adminEmail,
      username: adminUsername,
      displayName: "Admin Users E2E",
      published: true,
    });
    await seedPrimaryProfile(admin, {
      userId: targetUserId,
      email: targetEmail,
      username: targetUsername,
      displayName: "Managed User",
      published: true,
      verified: false,
    });

    const { error: promoteError } = await admin
      .from("profiles")
      .update({ role: "superadmin" })
      .eq("id", adminUserId);
    if (promoteError) throw promoteError;

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

    await page.goto(`/admin/users?q=${targetUsername}`);
    await expect(page.getByRole("heading", { name: /users/i })).toBeVisible();

    await page.getByTestId(`user-role-select-${targetUserId}`).selectOption("admin");
    await page.getByTestId(`user-role-save-${targetUserId}`).click();

    await expect.poll(async () => {
      const { data } = await admin.from("profiles").select("role").eq("id", targetUserId!).maybeSingle();
      return data?.role ?? null;
    }, { timeout: 15_000 }).toBe("admin");

    await page.getByTestId(`user-verified-toggle-${targetUserId}`).click();

    await expect.poll(async () => {
      const { data } = await admin
        .from("vcard_verifications")
        .select("status")
        .eq("user_id", targetUserId!)
        .order("submitted_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data?.status ?? null;
    }, { timeout: 15_000 }).toBe("approved");

    await page.reload();
    await expect(page.getByTestId(`user-role-select-${targetUserId}`)).toHaveValue("admin");
    await expect(page.getByTestId(`user-verified-toggle-${targetUserId}`)).toHaveText(/remove badge/i);
  } finally {
    if (targetUserId) {
      await admin.from("vcard_verifications").delete().eq("user_id", targetUserId);
      await admin.from("profiles").delete().eq("id", targetUserId);
      await admin.auth.admin.deleteUser(targetUserId);
    }
    if (adminUserId) {
      await admin.from("vcard_verifications").delete().eq("user_id", adminUserId);
      await admin.from("profiles").delete().eq("id", adminUserId);
      await admin.auth.admin.deleteUser(adminUserId);
    }
  }
});