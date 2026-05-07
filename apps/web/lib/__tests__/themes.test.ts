import { describe, it, expect } from "vitest";
import { THEME_PRESETS, getThemePreset, themeToCss } from "../themes/presets";
import { publicAssetUrl } from "../cdn";

describe("theme presets", () => {
  it("ships exactly 12 presets", () => {
    expect(THEME_PRESETS).toHaveLength(12);
  });

  it("each preset declares the required CSS variables", () => {
    const required = ["--vc-bg", "--vc-bg-2", "--vc-fg", "--vc-fg-mute", "--vc-accent", "--vc-accent-2", "--vc-radius"];
    for (const t of THEME_PRESETS) {
      for (const k of required) {
        expect(t.vars[k], `${t.id} missing ${k}`).toBeDefined();
      }
    }
  });

  it("ids are unique", () => {
    const ids = THEME_PRESETS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getThemePreset falls back to first preset", () => {
    expect(getThemePreset(null).id).toBe(THEME_PRESETS[0].id);
    expect(getThemePreset("nope-not-real").id).toBe(THEME_PRESETS[0].id);
    expect(getThemePreset("onyx-gold").id).toBe("onyx-gold");
  });

  it("themeToCss emits a scoped rule", () => {
    const css = themeToCss(THEME_PRESETS[0], ".vc-profile");
    expect(css).toContain(".vc-profile {");
    expect(css).toContain("--vc-bg:");
    expect(css.endsWith("}")).toBe(true);
  });

  it("rewrites Supabase public assets to Bunny CDN when configured", () => {
    const originalHost = process.env.NEXT_PUBLIC_BUNNY_CDN_HOST;
    const originalEnabled = process.env.NEXT_PUBLIC_BUNNY_CDN_ENABLED;
    process.env.NEXT_PUBLIC_BUNNY_CDN_HOST = "cdn.vcard.ed5enterprise.com";
    process.env.NEXT_PUBLIC_BUNNY_CDN_ENABLED = "true";
    expect(publicAssetUrl("https://abc.supabase.co/storage/v1/object/public/vcard-public/user/file.png")).toBe(
      "https://cdn.vcard.ed5enterprise.com/storage/v1/object/public/vcard-public/user/file.png",
    );
    process.env.NEXT_PUBLIC_BUNNY_CDN_HOST = originalHost;
    process.env.NEXT_PUBLIC_BUNNY_CDN_ENABLED = originalEnabled;
  });

  it("does NOT rewrite when CDN host is set but enabled flag is missing", () => {
    const originalHost = process.env.NEXT_PUBLIC_BUNNY_CDN_HOST;
    const originalEnabled = process.env.NEXT_PUBLIC_BUNNY_CDN_ENABLED;
    process.env.NEXT_PUBLIC_BUNNY_CDN_HOST = "cdn.vcard.ed5enterprise.com";
    delete process.env.NEXT_PUBLIC_BUNNY_CDN_ENABLED;
    const original = "https://abc.supabase.co/storage/v1/object/public/vcard-public/user/file.png";
    expect(publicAssetUrl(original)).toBe(original);
    process.env.NEXT_PUBLIC_BUNNY_CDN_HOST = originalHost;
    process.env.NEXT_PUBLIC_BUNNY_CDN_ENABLED = originalEnabled;
  });
});
