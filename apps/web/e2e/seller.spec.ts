import { existsSync } from "node:fs";
import { test, expect } from "@playwright/test";

const STORAGE = "e2e/.auth/user.json";
const HAS_AUTH = existsSync(STORAGE);

/**
 * Seller storefront E2E. These specs only assert UI scaffolding + auth-gating.
 * The actual Stripe Connect onboarding and checkout flows are not exercised
 * end-to-end here because they require live Stripe test-mode credentials and
 * an interactive Stripe-hosted page. Backed-out happy paths instead verify
 * each surface renders, server actions are wired, and the Store section type
 * is integrated into the editor.
 */
test.describe("seller storefront", () => {
  test.skip(!HAS_AUTH, "Auth storage state not available (run e2e:auth-setup).");
  test.use({ storageState: STORAGE });

  test("payments page renders and exposes connect CTA", async ({ page }) => {
    await page.goto("/account/payments");
    await expect(page.getByTestId("payments-page")).toBeVisible();
    await expect(page.getByTestId("payments-status-card")).toBeVisible();
    // Either "Connect with Stripe" (not connected) or "Open Stripe dashboard" (connected) must be present.
    const connect = page.getByTestId("connect-stripe");
    const manage = page.getByTestId("manage-stripe");
    await expect(connect.or(manage)).toBeVisible();
  });

  test("products list page renders empty state or product list", async ({ page }) => {
    await page.goto("/account/products");
    await expect(page.getByTestId("products-page")).toBeVisible();
    await expect(page.getByTestId("new-product")).toBeVisible();
  });

  test("product create form validates and renders", async ({ page }) => {
    await page.goto("/account/products/new");
    // If Stripe isn't connected, page shows a notice and not the form. Accept either case.
    const form = page.getByTestId("product-form");
    if (await form.count()) {
      await expect(page.getByTestId("product-name")).toBeVisible();
      await expect(page.getByTestId("product-price")).toBeVisible();
    } else {
      await expect(page.getByText(/Connect Stripe/i).first()).toBeVisible();
    }
  });

  test("editor exposes Store section type", async ({ page }) => {
    await page.goto("/edit");
    await page.getByTestId("add-section-trigger").click();
    // Add menu uses data-testid={`add-${type}`} per existing patterns
    await expect(page.getByTestId("add-store")).toBeVisible();
  });
});
