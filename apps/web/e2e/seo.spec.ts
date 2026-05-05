import { test, expect } from "@playwright/test";

const PAGES = ["/", "/pricing", "/shop", "/changelog", "/contact", "/privacy", "/terms"];

for (const path of PAGES) {
  test(`seo: ${path} has metadata + canonical`, async ({ page }) => {
    const res = await page.goto(path);
    expect(res?.status(), `status for ${path}`).toBeLessThan(400);

    const title = await page.title();
    expect(title.length, `title length for ${path}`).toBeGreaterThan(5);

    const desc = await page
      .locator('meta[name="description"]')
      .first()
      .getAttribute("content");
    expect(desc, `description for ${path}`).toBeTruthy();
    expect((desc ?? "").length, `description length for ${path}`).toBeGreaterThan(20);

    const canonical = await page
      .locator('link[rel="canonical"]')
      .first()
      .getAttribute("href");
    expect(canonical, `canonical for ${path}`).toBeTruthy();
    expect(canonical, `canonical for ${path}`).toContain(path === "/" ? "" : path);

    const ogImage = await page
      .locator('meta[property="og:image"]')
      .first()
      .getAttribute("content");
    expect(ogImage, `og:image for ${path}`).toBeTruthy();
  });
}

test("seo: home has Organization + WebSite JSON-LD", async ({ page }) => {
  await page.goto("/");
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const types = blocks
    .flatMap((b) => {
      try {
        const v = JSON.parse(b);
        return Array.isArray(v) ? v : [v];
      } catch {
        return [];
      }
    })
    .map((n: { "@type"?: string }) => n["@type"]);
  expect(types).toContain("Organization");
  expect(types).toContain("WebSite");
});

test("seo: pricing has FAQPage JSON-LD", async ({ page }) => {
  await page.goto("/pricing");
  const blocks = await page
    .locator('script[type="application/ld+json"]')
    .allTextContents();
  const found = blocks.some((b) => {
    try {
      const v = JSON.parse(b);
      const arr = Array.isArray(v) ? v : [v];
      return arr.some((n) => n?.["@type"] === "FAQPage");
    } catch {
      return false;
    }
  });
  expect(found, "FAQPage JSON-LD on /pricing").toBeTruthy();
});
