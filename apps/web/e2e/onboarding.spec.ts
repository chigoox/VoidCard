import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";

const STORAGE = "e2e/.auth/user.json";
const HAS_AUTH = existsSync(STORAGE);

test.describe("onboarding (unauth)", () => {
  test("redirects to /login when not signed in", async ({ page }) => {
    const response = await page.goto("/onboarding");
    // Proxy redirects unauth users to /login with ?next=/onboarding.
    expect(page.url()).toMatch(/\/login(\?|$)/);
    // 200 from /login or 3xx that resolves there is fine; we only assert URL.
    expect(response).toBeTruthy();
  });
});

test.describe("onboarding (authed)", () => {
  test.skip(!HAS_AUTH, "Auth storage state not available.");
  test.use({ storageState: STORAGE });

  test("renders wizard or redirects when complete", async ({ page }) => {
    // Force the proxy to allow /onboarding (it always allows this path for
    // authed users) and inspect the result. A fresh user lands on the wizard;
    // an already-onboarded user is redirected to /dashboard.
    await page.goto("/onboarding");
    const url = page.url();
    if (/\/dashboard/.test(url)) {
      // Already onboarded — verify the cookie was written so subsequent app
      // routes don't bounce them back through the wizard.
      const cookies = await page.context().cookies();
      expect(cookies.some((c) => c.name === "vcard_onb")).toBe(true);
      return;
    }

    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByTestId("onboarding-page")).toBeVisible();
    await expect(page.getByTestId("onboarding-progress")).toBeVisible();
    await expect(page.getByTestId("onboarding-skip")).toBeVisible();
  });

  test("skip button completes the cookie and redirects", async ({ page }) => {
    await page.goto("/onboarding");
    if (/\/dashboard/.test(page.url())) test.skip(true, "User is already onboarded.");

    await page.getByTestId("onboarding-skip").click();
    await page.waitForURL((url) => !/\/onboarding/.test(url.pathname), { timeout: 10_000 });
    const cookies = await page.context().cookies();
    expect(cookies.some((c) => c.name === "vcard_onb" && c.value === "5")).toBe(true);
  });
});
