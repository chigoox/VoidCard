import { test, expect } from "@playwright/test";

test("admin route redirects anonymous users", async ({ page }) => {
  const res = await page.goto("/admin");
  // requireAdmin → /login (not signed in)
  await expect(page).toHaveURL(/\/login|\/dashboard/);
  expect(res?.ok()).toBeTruthy();
});

test("admin sub-routes redirect anonymous users", async ({ page }) => {
  for (const path of ["/admin/products", "/admin/orders", "/admin/users", "/admin/settings", "/admin/plans", "/admin/subscriptions"]) {
    await page.goto(path);
    await expect(page).toHaveURL(/\/login|\/dashboard/);
  }
});

test("billing plan page renders pro upgrade", async ({ page }) => {
  await page.goto("/billing/pro");
  await expect(page.getByRole("heading", { level: 1, name: "Pro" })).toBeVisible();
  await expect(page.getByRole("link", { name: /yearly/i })).toBeVisible();
});

test("billing plan page renders team upgrade", async ({ page }) => {
  await page.goto("/billing/team");
  await expect(page.getByRole("heading", { level: 1, name: "Team" })).toBeVisible();
});

test("unknown billing plan returns 404", async ({ page }) => {
  const res = await page.goto("/billing/bogus");
  expect(res?.status()).toBe(404);
});

test("apple wallet stub returns 501", async ({ request }) => {
  const res = await request.get("/api/wallet/apple/anyuser");
  expect(res.status()).toBe(501);
  const body = await res.json();
  expect(body.error).toBe("wallet_unavailable");
});

test("google wallet stub returns 501", async ({ request }) => {
  const res = await request.get("/api/wallet/google/anyuser");
  expect(res.status()).toBe(501);
});

test("api keys endpoint requires auth", async ({ request }) => {
  const res = await request.get("/api/v1/keys");
  expect(res.status()).toBe(401);
});
