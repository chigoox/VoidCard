import { describe, expect, it } from "vitest";
import { isShortHost, routeShortHostPath, shortHost, shortUrl } from "./short-domain";

describe("short domain", () => {
  it("defaults to ed5z.com and cleans pasted values", () => {
    expect(shortHost(undefined)).toBe("ed5z.com");
    expect(shortHost(" https://ED5Z.com/\n")).toBe("ed5z.com");
    expect(shortUrl("abc123", "ed5z.com")).toBe("https://ed5z.com/l/abc123");
  });

  it("matches the apex and www only", () => {
    expect(isShortHost("ed5z.com", "ed5z.com")).toBe(true);
    expect(isShortHost("www.ed5z.com", "ed5z.com")).toBe(true);
    expect(isShortHost("vcard.ed5enterprise.com", "ed5z.com")).toBe(false);
    expect(isShortHost("evil-ed5z.com", "ed5z.com")).toBe(false);
  });

  it("routes codes to the redirect and everything else to the site", () => {
    expect(routeShortHostPath("/l/abc123")).toEqual({ kind: "code", code: "abc123" });
    expect(routeShortHostPath("/l/My-Promo/")).toEqual({ kind: "code", code: "my-promo" });
    for (const path of ["/", "/abc123", "/l/", "/l/ab", "/l/a/b", "/l/x.png", "/l/../edit"]) expect(routeShortHostPath(path)).toEqual({ kind: "site" });
  });
});
