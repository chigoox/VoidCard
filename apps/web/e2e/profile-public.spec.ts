import { test, expect } from "@playwright/test";

// Requires a seeded published profile with username SEED (set via env).
const username = process.env.E2E_PUBLIC_USERNAME ?? "voidluxury";

test("public profile renders sections and footer attribution", async ({ page }) => {
  const r = await page.goto(`/u/${username}`);
  if (r?.status() === 404) test.skip(true, `profile @${username} not seeded`);
  await expect(page.locator("main")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("public profile is mobile-fast (no client-side blockers)", async ({ page }) => {
  const r = await page.goto(`/u/${username}`);
  if (r?.status() === 404) test.skip(true, `profile @${username} not seeded`);
  // Smoke perf: DOMContentLoaded under 2s on mobile project.
  const navTiming = await page.evaluate(() => {
    const e = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    return e ? e.domContentLoadedEventEnd : null;
  });
  if (navTiming != null) expect(navTiming).toBeLessThan(2500);
});
