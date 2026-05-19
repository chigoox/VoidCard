import { afterEach, describe, expect, it } from "vitest";
import { getCookieDomain } from "./cookie-domain";

const ORIGINAL_NEXT_PUBLIC_COOKIE_DOMAIN = process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
const ORIGINAL_SUPABASE_COOKIE_DOMAIN = process.env.SUPABASE_COOKIE_DOMAIN;

afterEach(() => {
  process.env.NEXT_PUBLIC_COOKIE_DOMAIN = ORIGINAL_NEXT_PUBLIC_COOKIE_DOMAIN;
  process.env.SUPABASE_COOKIE_DOMAIN = ORIGINAL_SUPABASE_COOKIE_DOMAIN;
});

describe("getCookieDomain", () => {
  it("returns the configured domain for matching subdomains", () => {
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN = ".ed5enterprise.com";
    delete process.env.SUPABASE_COOKIE_DOMAIN;

    expect(getCookieDomain(undefined, "vcard.ed5enterprise.com")).toBe("ed5enterprise.com");
    expect(getCookieDomain(undefined, "app.ed5enterprise.com")).toBe("ed5enterprise.com");
  });

  it("returns undefined on localhost even when a production cookie domain is configured", () => {
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN = ".ed5enterprise.com";
    delete process.env.SUPABASE_COOKIE_DOMAIN;

    expect(getCookieDomain(undefined, "localhost")).toBeUndefined();
    expect(getCookieDomain(undefined, "127.0.0.1")).toBeUndefined();
  });

  it("returns undefined for unrelated hosts", () => {
    process.env.NEXT_PUBLIC_COOKIE_DOMAIN = ".ed5enterprise.com";
    delete process.env.SUPABASE_COOKIE_DOMAIN;

    expect(getCookieDomain(undefined, "preview.vercel.app")).toBeUndefined();
  });

  it("falls back to the provided domain when it matches the current host", () => {
    delete process.env.NEXT_PUBLIC_COOKIE_DOMAIN;
    delete process.env.SUPABASE_COOKIE_DOMAIN;

    expect(getCookieDomain("example.com", "app.example.com")).toBe("example.com");
  });
});