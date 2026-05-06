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

type DomainSeed = {
  id: string;
  txt_token: string;
  status: string;
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
  const [domainCheck] = await Promise.all([
    admin.from("vcard_custom_domains").select("id").limit(1),
  ]);

  return !!source && !domainCheck.error;
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

test("custom domain flow saves DNS instructions", async ({ page }) => {
  test.slow();
  test.skip(!ENV, "Supabase env missing for custom-domain E2E.");

  if (!(await hasVoidCardSchema())) {
    test.skip(true, "Configured Supabase project is missing the VoidCard tables required for custom-domain E2E.");
    return;
  }

  const admin = createAdminClientOrThrow();
  const password = `VoidCard-${randomUUID()}-A1!`;
  const email = `domains-${randomUUID()}@voidcard-test.dev`;
  const username = `domain${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  const hostname = `cards-${randomUUID().replaceAll("-", "").slice(0, 12)}.voidcard-e2e.test`;
  let userId: string | null = null;
  let createdDomain: DomainSeed | null = null;

  try {
    const createUser = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createUser.error) throw createUser.error;
    userId = createUser.data.user?.id ?? null;
    if (!userId) throw new Error("Supabase did not return a user id.");

    await seedPrimaryProfile(admin, {
      userId,
      email,
      username,
      displayName: "Custom Domain E2E",
      plan: "pro",
      verified: false,
      published: true,
    });

    const sessionCookies = await createSessionCookies(email, password);
    await page.context().addCookies(
      sessionCookies.map(({ name, value }) => ({
        name,
        value,
        url: BASE_URL,
        sameSite: "Lax" as const,
        secure: false,
      }))
    );

    await page.goto("/account/domains");
    await expect(page.getByTestId("domain-form")).toBeVisible();
    await page.getByTestId("domain-hostname").fill(hostname);
    await page.getByTestId("domain-submit").click();

    await expect.poll(async () => {
      const result = await admin
        .from("vcard_custom_domains")
        .select("id, txt_token, status")
        .eq("user_id", userId!)
        .eq("hostname", hostname)
        .maybeSingle();

      createdDomain = result.error || !result.data ? null : (result.data as DomainSeed);
      return createdDomain?.status ?? null;
    }, { timeout: 15_000 }).toBe("pending");

    await expect(page.getByTestId("domain-notice")).toContainText("Domain saved");
    if (!createdDomain) throw new Error("Expected custom domain row to be created.");
    const domain = createdDomain as DomainSeed;

    await expect(page.getByTestId(`domain-row-${domain.id}`)).toBeVisible();
    await expect(page.getByTestId(`domain-token-${domain.id}`)).toHaveText(domain.txt_token);
    await expect(page.getByTestId(`domain-target-name-${domain.id}`)).toHaveText(hostname);
  } finally {
    if (userId) {
      await admin.from("vcard_custom_domains").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }
});