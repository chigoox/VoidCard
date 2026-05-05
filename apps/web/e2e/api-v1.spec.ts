import { test, expect, request } from "@playwright/test";

const KEY = process.env.E2E_API_KEY;

test("v1/profile requires bearer", async ({ request }) => {
  const res = await request.get("/api/v1/profile");
  expect([401, 403]).toContain(res.status());
});

test("v1/profile returns json with valid key", async () => {
  test.skip(!KEY, "E2E_API_KEY not set");
  const ctx = await request.newContext();
  const res = await ctx.get("/api/v1/profile", { headers: { authorization: `Bearer ${KEY}` } });
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.profile).toBeDefined();
});
