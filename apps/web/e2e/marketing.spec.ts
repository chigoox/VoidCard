import { test, expect } from "@playwright/test";

const ROUTES: { path: string; heading: RegExp }[] = [
  { path: "/pricing", heading: /pricing|plans|tier/i },
  { path: "/shop", heading: /shop|cards|store/i },
  { path: "/try", heading: /try|preview|build/i },
  { path: "/terms", heading: /terms/i },
  { path: "/privacy", heading: /privacy/i },
  { path: "/changelog", heading: /changelog|release/i },
  { path: "/docs/api", heading: /api|reference/i },
];

for (const { path, heading } of ROUTES) {
  test(`marketing: ${path} renders`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status(), `status for ${path}`).toBeLessThan(400);
    await expect(page.getByRole("heading").first()).toBeVisible();
    await expect(
      page.getByText(heading).filter({ visible: true }).first(),
    ).toBeVisible();
  });
}

test("home links to pricing and shop", async ({ page }) => {
  await page.goto("/");
  // Use href-based locators so we don't depend on which links are visible at the current viewport.
  await expect(page.locator('a[href="/pricing"]').first()).toHaveAttribute("href", "/pricing");
  await expect(page.locator('a[href="/shop"]').first()).toHaveAttribute("href", "/shop");
});
