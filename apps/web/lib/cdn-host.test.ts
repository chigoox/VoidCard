import { describe, expect, it } from "vitest";
import { normalizeCdnHost } from "./cdn-host";

describe("normalizeCdnHost", () => {
  it("cleans values pasted into hosting dashboards", () => {
    expect(normalizeCdnHost("cdn.vcard.ed5enterprise.com\n")).toBe("cdn.vcard.ed5enterprise.com");
    expect(normalizeCdnHost("  CDN.Example.com \r\n")).toBe("cdn.example.com");
    expect(normalizeCdnHost("https://cdn.example.com/")).toBe("cdn.example.com");
    expect(normalizeCdnHost("cdn.example.com/assets?x=1")).toBe("cdn.example.com");
  });

  it("rejects unset or unusable values", () => {
    for (const bad of [undefined, null, "", "   ", "cdn example.com", "cdn.example.com\nevil", "localhost", "a;b.com"]) {
      expect(normalizeCdnHost(bad)).toBeNull();
    }
  });
});
