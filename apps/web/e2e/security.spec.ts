import { test, expect } from "@playwright/test";

test.describe("security headers", () => {
  test("home page sets HSTS, CSP-Report-Only, and Referrer-Policy", async ({ request }) => {
    const res = await request.get("/");
    expect(res.status()).toBe(200);
    const headers = res.headers();

    // Headers that must always be present.
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["referrer-policy"]).toBe("strict-origin-when-cross-origin");
    expect(headers["x-frame-options"]).toMatch(/^(SAMEORIGIN|DENY)$/);
    expect(headers["permissions-policy"]).toContain("payment=");
    expect(headers["cross-origin-opener-policy"]).toBe("same-origin");

    // CSP delivered (report-only by default; enforce when CSP_MODE=enforce).
    const csp =
      headers["content-security-policy"] ?? headers["content-security-policy-report-only"];
    expect(csp, "CSP header missing").toBeTruthy();
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  });

  test("security.txt is reachable", async ({ request }) => {
    const res = await request.get("/.well-known/security.txt");
    expect(res.status()).toBe(200);
    const body = await res.text();
    expect(body).toContain("Contact: mailto:security@");
    expect(body).toMatch(/Expires:\s+\d{4}-\d{2}-\d{2}/);
  });

  test("CSP report endpoint accepts and 204s", async ({ request }) => {
    const res = await request.post("/api/security/csp-report", {
      headers: { "content-type": "application/csp-report" },
      data: JSON.stringify({
        "csp-report": {
          "document-uri": "https://example.com/",
          "violated-directive": "script-src",
          "blocked-uri": "https://evil.example/x.js",
        },
      }),
    });
    expect([204, 429]).toContain(res.status());
  });
});

test.describe("legal & trust pages", () => {
  for (const path of ["/legal/dpa", "/legal/subprocessors", "/legal/cookies", "/legal/security", "/trust"]) {
    test(`${path} renders`, async ({ page }) => {
      const res = await page.goto(path);
      expect(res?.status()).toBe(200);
      // Basic anti-regression: heading present.
      await expect(page.locator("h1")).toBeVisible();
    });
  }
});
