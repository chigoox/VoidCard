// Captures full-page screenshots of public marketing pages for marketing assets.
// Usage:
//   node scripts/marketing-screenshots.mjs                # uses https://vcard.ed5enterprise.com
//   BASE_URL=http://localhost:3000 node scripts/marketing-screenshots.mjs
//
// Output: <repo-root>/screenshots/{desktop,mobile}/<slug>.png

import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const outRoot = path.join(repoRoot, "screenshots");

const BASE_URL = (process.env.BASE_URL ?? "https://vcard.ed5enterprise.com").replace(/\/$/, "");

// Public, unauthenticated marketing + info pages.
const ROUTES = [
  ["home", "/"],
  ["pricing", "/pricing"],
  ["why-voidcard", "/why-voidcard"],
  ["shop", "/shop"],
  ["discover", "/discover"],
  ["customers", "/customers"],
  ["press", "/press"],
  ["contact", "/contact"],
  ["changelog", "/changelog"],
  ["roadmap", "/roadmap"],
  ["docs", "/docs"],
  ["trust", "/trust"],
  ["ai-policy", "/ai-policy"],
  ["legal", "/legal"],
  ["privacy", "/privacy"],
  ["terms", "/terms"],
  ["try", "/try"],
  ["login", "/login"],
  ["signup", "/signup"],
];

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  { name: "mobile", ...devices["Pixel 7"] },
];

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function capture(browser, vp) {
  const dir = path.join(outRoot, vp.name);
  await ensureDir(dir);

  const context = await browser.newContext({
    ...vp,
    reducedMotion: "reduce",
    colorScheme: "dark",
  });
  const page = await context.newPage();

  // Best-effort cookie banner / animation suppression.
  await page.addInitScript(() => {
    try {
      localStorage.setItem("cookie-consent", "accepted");
      localStorage.setItem("vcard-cookie-consent", "accepted");
    } catch {}
  });

  for (const [slug, route] of ROUTES) {
    const url = `${BASE_URL}${route}`;
    const file = path.join(dir, `${slug}.png`);
    try {
      const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
      const status = resp?.status() ?? 0;
      if (status >= 400) {
        console.warn(`[${vp.name}] ${slug} ${url} -> HTTP ${status} (skipped)`);
        continue;
      }
      // Let lazy content settle.
      await page.waitForTimeout(800);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`[${vp.name}] ${slug} -> ${path.relative(repoRoot, file)}`);
    } catch (err) {
      console.warn(`[${vp.name}] ${slug} ${url} -> ${err.message}`);
    }
  }

  await context.close();
}

(async () => {
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output:   ${outRoot}`);
  await ensureDir(outRoot);
  const browser = await chromium.launch();
  try {
    for (const vp of VIEWPORTS) {
      await capture(browser, vp);
    }
  } finally {
    await browser.close();
  }
  console.log("Done.");
})();
