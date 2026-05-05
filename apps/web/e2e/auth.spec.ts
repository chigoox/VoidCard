import { test, expect } from "@playwright/test";

test("home → CTA → login form visible", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.getByRole("link", { name: /start free/i }).first().click();
  await expect(page).toHaveURL(/\/signup|\/login/);
});

test("login page exposes password, magic link, and Google", async ({ page }) => {
  await page.goto("/login?next=/dashboard");
  await expect(page.getByTestId("login-password")).toBeVisible();
  await expect(page.getByTestId("login-password-submit")).toBeVisible();
  await expect(page.getByTestId("login-google")).toBeVisible();

  await page.getByTestId("login-mode-magic").click();
  await expect(page.getByTestId("login-submit")).toBeVisible();
  await expect(page.getByTestId("login-password")).toBeHidden();
});

test("login form posts magic link request", async ({ page }) => {
  let payload: Record<string, unknown> | undefined;

  await page.route("**/api/auth/magic-link", async (route) => {
    payload = (route.request().postDataJSON() as Record<string, unknown>) ?? undefined;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true }),
    });
  });

  await page.goto("/login?next=/dashboard");
  await page.getByTestId("login-mode-magic").click();
  await page.getByTestId("login-email").fill("e2e@voidcard-test.dev");
  await page.getByTestId("login-submit").click();
  await expect(page.getByTestId("login-msg")).toHaveText(/check your inbox/i);
  expect(payload?.email).toBe("e2e@voidcard-test.dev");
  expect(payload?.next).toBe("/dashboard");
});

test("signup validates username regex", async ({ page }) => {
  await page.goto("/signup");
  await page.getByTestId("signup-username").fill("BAD NAME!");
  await page.getByTestId("signup-email").fill("e2e@example.com");
  await page.getByTestId("signup-submit").click();
  await expect(page.getByText(/lowercase|invalid|3-32/i)).toBeVisible();
});

test("signup posts password payload", async ({ page }) => {
  let payload: Record<string, unknown> | undefined;

  await page.route("**/api/auth/signup", async (route) => {
    payload = (route.request().postDataJSON() as Record<string, unknown>) ?? undefined;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ok: true, needsEmailConfirmation: true }),
    });
  });

  await page.goto("/signup?next=/billing/pro");
  await page.getByTestId("signup-email").fill("e2e@example.com");
  await page.getByTestId("signup-username").fill("voidbuilder");
  await page.getByTestId("signup-password").fill("strongpass123");
  await page.getByTestId("signup-confirm").fill("strongpass123");
  await page.getByTestId("signup-submit").click();

  await expect(page.getByTestId("signup-msg")).toHaveText(/check your inbox/i);
  expect(payload?.email).toBe("e2e@example.com");
  expect(payload?.username).toBe("voidbuilder");
  expect(payload?.password).toBe("strongpass123");
  expect(payload?.next).toBe("/billing/pro");
});
