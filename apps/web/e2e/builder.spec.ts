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
    await page.getByTestId("add-section-trigger").click();
    await page.getByTestId("add-link").click();
    await expect(page.getByTestId("section-list").locator("> li")).toHaveCount(1);

    await page.getByTestId("save-draft").click();

    await page.getByTestId("publish").click();
    await page.getByTestId("publish-confirm-yes").click();
    await expect(page.getByText(/published/i)).toBeVisible({ timeout: 10_000 });
  });

  test("share row and storage meter render", async ({ page }) => {
    await page.goto("/edit");
    await expect(page.getByTestId("share-row")).toBeVisible();
    await expect(page.getByTestId("copy-share")).toBeVisible();
    await expect(page.getByTestId("storage-meter")).toBeVisible({ timeout: 10_000 });
  });

  test("bulk-add links creates link sections", async ({ page }) => {
    await page.goto("/edit");
    await page.getByTestId("sections-more-menu").locator("summary").click();
    await page.getByTestId("bulk-links-trigger").click();
    await expect(page.getByTestId("bulk-links-modal")).toBeVisible();
    await page
      .getByTestId("bulk-links-textarea")
      .fill("My GitHub | https://github.com/example\nhttps://example.com");
    const before = await page.getByTestId("section-list").locator("> li").count();
    await page.getByTestId("bulk-links-apply").click();
    await expect(page.getByTestId("bulk-links-modal")).toBeHidden();
    await expect
      .poll(async () => page.getByTestId("section-list").locator("> li").count())
      .toBe(before + 2);
  });

  test("gallery accepts multiple image URLs at once", async ({ page }) => {
    await page.goto("/edit");
    const rows = page.getByTestId("section-list").locator("> li");
    const before = await rows.count();

    await page.getByTestId("add-section-trigger").click();
    await page.getByTestId("add-gallery").click();

    const galleryRow = rows.nth(before);
    await expect(galleryRow.getByTestId("gallery-bulk-images")).toBeVisible();
    await galleryRow
      .getByTestId("gallery-image-url-list")
      .fill("https://placehold.co/700x500\nhttps://placehold.co/800x600");
    await galleryRow.getByTestId("gallery-add-url-list").click();

    await expect(galleryRow.getByLabel("Image URL", { exact: true })).toHaveCount(3);
    await expect(galleryRow.getByTestId("gallery-bulk-message")).toBeVisible();
  });

  test("publish requires confirmation", async ({ page }) => {
    await page.goto("/edit");
    await page.getByTestId("publish").click();
    await expect(page.getByTestId("publish-confirm")).toBeVisible();
    await page.getByRole("button", { name: /cancel/i }).first().click();
    await expect(page.getByTestId("publish-confirm")).toBeHidden();
  });

  test("schedule publish panel renders and saves snapshot", async ({ page }) => {
    await page.goto("/edit");
    await expect(page.getByTestId("schedule-publish")).toBeVisible();
    await expect(page.getByTestId("versions-panel")).toBeVisible();
    await page.getByTestId("snapshot-label").fill("e2e snapshot");
    await page.getByTestId("snapshot-save").click();
    await page.getByTestId("versions-toggle").click();
    await expect(page.getByTestId("versions-list")).toBeVisible({ timeout: 10_000 });
  });

  test("product picker opens and lists products", async ({ page }) => {
    await page.goto("/edit");
    await page.getByTestId("sections-more-menu").locator("summary").click();
    await page.getByTestId("product-picker-trigger").click();
    await expect(page.getByTestId("product-picker-modal")).toBeVisible();
  });

  test("variants panel renders", async ({ page }) => {
    await page.goto("/edit");
    await expect(page.getByTestId("variants-panel")).toBeVisible();
  });
});
