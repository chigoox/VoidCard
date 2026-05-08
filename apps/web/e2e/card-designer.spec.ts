import { test, expect } from "./fixtures";
import { existsSync } from "node:fs";

const STORAGE = "e2e/.auth/user.json";
const HAS_AUTH = existsSync(STORAGE);
const DESIGN_ID = "11111111-1111-4111-8111-111111111111";

test.describe("custom card checkout gate", () => {
  test("requires a design before checkout", async ({ page }) => {
    await page.goto("/shop/card-custom");
    await expect(page.getByTestId("custom-card-choose-design")).toBeVisible();
  });

  test("sends unverified buyers to verification", async ({ page }) => {
    await page.route("**/api/stripe/checkout", async (route) => {
      await route.fulfill({
        status: 403,
        contentType: "application/json",
        body: JSON.stringify({ error: "verified_required" }),
      });
    });

    await page.goto(`/shop/card-custom?design_id=${DESIGN_ID}`);
    await page.getByTestId("custom-card-checkout").click();
    await expect(page).toHaveURL(/\/(account\/verify|login\?next=%2Faccount%2Fverify)$/);
  });
});

test.describe("card designer", () => {
  test.skip(!HAS_AUTH, "Auth storage state not available (run e2e:auth-setup).");
  test.use({ storageState: STORAGE });

  test("create design, add text, save, delete", async ({ page }) => {
    await page.goto("/cards/design");
    await page.getByTestId("design-new").click();

    // Editor loaded — Konva mounts the canvas inside the stage container.
    await expect(page.getByTestId("card-designer")).toBeVisible();
    await expect(page.getByTestId("design-stage")).toBeVisible();
    await expect(page.getByTestId("design-stage").locator("canvas")).toBeVisible({
      timeout: 10_000,
    });

    // Add a text element.
    await page.getByTestId("tool-text").click();

    // Switch to back side and back.
    await page.getByTestId("design-side-back").click();
    await page.getByTestId("design-side-front").click();

    // Rename and save.
    const nameField = page.getByTestId("design-name");
    await nameField.fill("E2E test design");
    await page.getByTestId("design-save").click();
    await expect(page.getByTestId("design-status")).toContainText(/Saved/i, {
      timeout: 10_000,
    });

    // Back to list, the new design appears, then delete it.
    await page.goto("/cards/design");
    const row = page.getByTestId("design-row").filter({ hasText: "E2E test design" });
    await expect(row).toBeVisible();
    await row.getByTestId("design-delete").click();
    await expect(row).toHaveCount(0);
  });
});
