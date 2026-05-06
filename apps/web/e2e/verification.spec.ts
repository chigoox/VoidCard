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

test("verification flow submits brand proof", async ({ page }) => {
  test.skip(!ENV, "Supabase env missing for verification E2E.");

  if (!(await hasVoidCardSchema())) {
    test.skip(true, "Configured Supabase project is missing the VoidCard tables required for verification E2E.");
    return;
  }

  const admin = createAdminClientOrThrow();
  const password = `VoidCard-${randomUUID()}-A1!`;
  const email = `verify-${randomUUID()}@voidcard-test.dev`;
  const username = `verify${randomUUID().replaceAll("-", "").slice(0, 12)}`;
  let userId: string | null = null;
  let verificationId: string | null = null;

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
      displayName: "Verification E2E",
      plan: "free",
      verified: false,
      published: false,
    });

    const seededVerification = await admin
      .from("vcard_verifications")
      .insert({
        user_id: userId,
        method: "brand",
        status: "pending",
        paid: true,
        documents: [],
      })
      .select("id")
      .single();
    if (seededVerification.error) throw seededVerification.error;
    verificationId = seededVerification.data.id;

    const retryCandidate = await admin.from("vcard_verifications").insert({
      user_id: userId,
      method: "brand",
      status: "rejected",
      paid: true,
      documents: [],
      submitted_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      decided_at: new Date().toISOString(),
    });
    if (retryCandidate.error) throw retryCandidate.error;

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

    await page.goto("/account/verify");
    await expect(page.getByRole("heading", { name: /make your profile official/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /send for review/i })).toBeDisabled();

    await page.getByLabel(/trademark registration number/i).fill("USPTO-TEST-12345");
    await page.getByLabel(/extra context for the reviewer/i).fill("Brand verification submitted by Playwright.");
    await expect(page.getByRole("button", { name: /send for review/i })).toBeEnabled();
    await page.getByRole("button", { name: /send for review/i }).click();

    await expect.poll(async () => {
      const verification = await admin
        .from("vcard_verifications")
        .select("method, documents, risk_flags, risk_score, document_hashes")
        .eq("id", verificationId!)
        .single();
      if (verification.error || !verification.data) return false;

      const documents = Array.isArray(verification.data.documents) ? verification.data.documents : [];
      const riskFlags = Array.isArray(verification.data.risk_flags) ? verification.data.risk_flags : [];
      const documentHashes = Array.isArray(verification.data.document_hashes)
        ? verification.data.document_hashes
        : [];
      const kinds = documents.flatMap((document) => {
        if (!document || typeof document !== "object" || !("kind" in document)) return [];
        const kind = (document as { kind: unknown }).kind;
        return typeof kind === "string" ? [kind] : [];
      });

      return (
        verification.data.method === "brand" &&
        kinds.includes("trademark_registration") &&
        kinds.includes("submission_note") &&
        riskFlags.includes("recent_rejection_retry") &&
        verification.data.risk_score === 20 &&
        documentHashes.length === 0
      );
    }, { timeout: 15_000 }).toBe(true);

    await page.reload();
    await expect(page.getByText(/attached proof/i)).toBeVisible();
    await expect(page.getByText(/trademark registration/i)).toBeVisible();
    await expect(page.getByText(/reviewer note/i)).toBeVisible();
  } finally {
    if (userId) {
      await admin.from("vcard_verifications").delete().eq("user_id", userId);
      await admin.auth.admin.deleteUser(userId);
    }
  }
});