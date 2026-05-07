// Captures full-page screenshots of public user profile pages (/u/<handle>) for marketing.
// Discovers usernames by scraping /discover, then screenshots each profile in desktop + mobile.
//
// Usage:
//   node scripts/marketing-user-screenshots.mjs
//   BASE_URL=http://localhost:3000 LIMIT=20 node scripts/marketing-user-screenshots.mjs
//
// Output: <repo-root>/screenshots/users/{desktop,mobile}/<username>.png

import { chromium, devices } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..", "..");
const outRoot = path.join(repoRoot, "screenshots", "users");

const BASE_URL = (process.env.BASE_URL ?? "https://vcard.ed5enterprise.com").replace(/\/$/, "");
const LIMIT = Number(process.env.LIMIT ?? 24);
const USERNAMES = (process.env.USERNAMES ?? "")
  .split(",")
  .map((entry) => entry.trim().toLowerCase())
  .filter(Boolean);

const VIEWPORTS = [
  { name: "desktop", viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 },
  { name: "mobile", ...devices["Pixel 7"] },
];

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function discoverUsernames(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const found = new Set();

  // Walk /discover paginating by cursor when present.
  let url = `${BASE_URL}/discover`;
  for (let i = 0; i < 5 && found.size < LIMIT; i += 1) {
    const resp = await page.goto(url, { waitUntil: "networkidle", timeout: 30_000 });
    if (!resp || resp.status() >= 400) break;
    const usernames = await page.$$eval("[data-testid^='discover-card-']", (els) =>
      els.map((el) => el.getAttribute("data-testid")?.replace("discover-card-", "")).filter(Boolean),
    );
    usernames.forEach((u) => found.add(u));
    const next = await page.$eval(
      "a[href*='/discover'][href*='cursor']",
      (a) => a.getAttribute("href"),
    ).catch(() => null);
    if (!next) break;
    url = new URL(next, BASE_URL).toString();
  }

  await ctx.close();
  return [...found].slice(0, LIMIT);
}

async function capture(browser, vp, usernames) {
  const dir = path.join(outRoot, vp.name);
  await ensureDir(dir);

  const context = await browser.newContext({
    ...vp,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();

  await page.addInitScript(() => {
    try {
      localStorage.setItem("vc.consent.v1", JSON.stringify({ analytics: false, marketing: false, ts: Date.now() }));
      localStorage.setItem("vc.cookie_id", "marketing-user-screenshot");
    } catch {}
  });

  for (const u of usernames) {
    const url = `${BASE_URL}/u/${u}`;
    const file = path.join(dir, `${u}.png`);
    try {
      const resp = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
      const status = resp?.status() ?? 0;
      if (status >= 400) {
        console.warn(`[${vp.name}] ${u} -> HTTP ${status} (skipped)`);
        continue;
      }
      await page.getByRole("button", { name: "Reject all" }).click({ timeout: 1_000 }).catch(() => null);
      await loadLazyContent(page);
      await page.waitForTimeout(900);
      await page.screenshot({ path: file, fullPage: true });
      console.log(`[${vp.name}] ${u} -> ${path.relative(repoRoot, file)}`);
    } catch (err) {
      console.warn(`[${vp.name}] ${u} ${url} -> ${err.message}`);
    }
  }

  await context.close();
}

async function loadLazyContent(page) {
  await page.evaluate(async () => {
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const step = Math.max(400, Math.floor(window.innerHeight * 0.75));
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    for (let y = 0; y <= maxY; y += step) {
      window.scrollTo(0, y);
      await delay(120);
    }
    window.scrollTo(0, maxY);
    await delay(180);
    window.scrollTo(0, 0);
  });

  await page.waitForLoadState("domcontentloaded");
  await page.waitForFunction(() =>
    Array.from(document.images).every((img) => img.complete && img.naturalWidth > 0),
    { timeout: 10_000 },
  ).catch(() => null);
}

(async () => {
  console.log(`Base URL: ${BASE_URL}`);
  console.log(`Output:   ${outRoot}`);
  await ensureDir(outRoot);
  const browser = await chromium.launch();
  try {
    const usernames = USERNAMES.length > 0 ? USERNAMES.slice(0, LIMIT) : await discoverUsernames(browser);
    console.log(`${USERNAMES.length > 0 ? "Using" : "Discovered"} ${usernames.length} usernames: ${usernames.join(", ") || "(none)"}`);
    if (!usernames.length) {
      console.warn("No public profiles found on /discover. Nothing to capture.");
      return;
    }
    for (const vp of VIEWPORTS) {
      await capture(browser, vp, usernames);
    }
  } finally {
    await browser.close();
  }
  console.log("Done.");
})();
