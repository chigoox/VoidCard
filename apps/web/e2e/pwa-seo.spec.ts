import { test, expect } from "@playwright/test";

test("pwa: manifest is valid", async ({ request }) => {
  const res = await request.get("/manifest.webmanifest");
  expect(res.status()).toBe(200);
  const m = await res.json();
  expect(m.name).toBeTruthy();
  expect(m.start_url).toBeTruthy();
  expect(m.display).toMatch(/standalone|minimal-ui|fullscreen/);
  expect(Array.isArray(m.icons)).toBe(true);
  expect(m.icons.length).toBeGreaterThanOrEqual(2);
  const sizes = m.icons.map((i: { sizes: string }) => i.sizes);
  expect(sizes).toContain("192x192");
  expect(sizes).toContain("512x512");
});

test("pwa: robots.txt blocks AI training bots", async ({ request }) => {
  const res = await request.get("/robots.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/User-agent: GPTBot/);
  expect(body).toMatch(/User-agent: ClaudeBot/);
  expect(body).toMatch(/User-agent: CCBot/);
  expect(body).toMatch(/Sitemap:/);
});

test("pwa: sitemap.xml is well-formed", async ({ request }) => {
  const res = await request.get("/sitemap.xml");
  expect(res.status()).toBe(200);
  const xml = await res.text();
  expect(xml).toContain("<urlset");
  expect(xml).toContain("<loc>");
});

test("pwa: llms.txt served", async ({ request }) => {
  const res = await request.get("/llms.txt");
  expect(res.status()).toBe(200);
  expect(res.headers()["content-type"]).toMatch(/text\/(plain|markdown)/);
  const body = await res.text();
  expect(body.length).toBeGreaterThan(50);
});

test("pwa: ai.txt served", async ({ request }) => {
  const res = await request.get("/ai.txt");
  expect(res.status()).toBe(200);
  const body = await res.text();
  expect(body).toMatch(/VoidCard/i);
});

test("pwa: ai-policy page renders", async ({ page }) => {
  const res = await page.goto("/ai-policy");
  expect(res?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading").first()).toBeVisible();
});

test("pwa: offline page renders with noindex", async ({ page }) => {
  const res = await page.goto("/offline");
  expect(res?.status()).toBeLessThan(400);
  const robots = await page
    .locator('meta[name="robots"]')
    .first()
    .getAttribute("content");
  expect(robots ?? "").toMatch(/noindex/);
});
