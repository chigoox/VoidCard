import { test, expect } from "@playwright/test";
import { existsSync } from "node:fs";

const STORAGE = "e2e/.auth/user.json";
const HAS_AUTH = existsSync(STORAGE);

test.describe("builder — booking section", () => {
  test.skip(!HAS_AUTH, "Auth storage state not available (run e2e:auth-setup).");
  test.use({ storageState: STORAGE });

  test("can add a booking section, configure it, and save a draft", async ({ page }) => {
    await page.goto("/edit");

    const rows = page.getByTestId("section-list").locator("> li");
    const before = await rows.count();

    await page.getByTestId("add-section-trigger").click();
    await page.getByTestId("add-booking").click();

    const newRow = rows.nth(before);
    const slugInput = newRow.locator('[data-testid^="booking-slug-"]');
    await expect(slugInput).toBeVisible();
    await slugInput.fill("demo-handle");
    await expect(slugInput).toHaveValue("demo-handle");

    // Embed mode is default — height field should be present.
    await expect(newRow.locator('input[type="number"]').first()).toBeVisible();

    await page.getByTestId("save-draft").click();
    await expect(rows).toHaveCount(before + 1);
  });
});
