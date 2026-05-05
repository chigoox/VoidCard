import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";

const STORAGE = "e2e/.auth/user.json";
const HAS_AUTH = existsSync(STORAGE);

// Builder happy path requires authenticated user. We rely on Supabase test-user storageState
// produced by `pnpm e2e:auth-setup` (script reads SUPABASE_TEST_EMAIL/PASSWORD).
test.describe("builder", () => {
  test.skip(!HAS_AUTH, "Auth storage state not available (run e2e:auth-setup).");
  test.use({ storageState: STORAGE });

  test("can add a link section, save, and publish", async ({ page }) => {
    await page.goto("/edit");
    await page.getByTestId("add-link").click();
    await expect(page.getByTestId("section-list").locator("li")).toHaveCount(1);

    await page.getByTestId("save-draft").click();
    await expect(page.getByText(/:/, { exact: false })).toBeVisible(); // saved-at timestamp

    await page.getByTestId("publish").click();
    await expect(page.getByText(/published/i)).toBeVisible({ timeout: 10_000 });
  });
});
