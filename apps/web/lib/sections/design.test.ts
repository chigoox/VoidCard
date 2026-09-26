import { describe, expect, it } from "vitest";
import { DESIGN_PRESETS, designAttributes, hasDesign } from "./design";
import { SectionDesign } from "./types";
import { parseStat } from "@/components/sections/StatsCounter";

describe("section design", () => {
  it("maps design settings to data attributes and CSS variables", () => {
    const attrs = designAttributes({ surface: "glass", hover: "tilt", accent: "#ff00aa", bg: "#111111", bg2: "#222222", gradientAngle: 90, scale: "lg" })!;
    expect(attrs.className).toBe("vc-design");
    expect(attrs.data).toMatchObject({ "data-vc-surface": "glass", "data-vc-hover": "tilt", "data-vc-bg": "" });
    expect(attrs.style).toMatchObject({
      "--vc-accent": "#ff00aa",
      "--vc-design-bg": "linear-gradient(90deg, #111111, #222222)",
      "--vc-design-scale": "1.15",
    });
  });

  it("ignores empty designs and rejects unsafe values", () => {
    expect(hasDesign({ preset: "x", surface: "none" })).toBe(false);
    expect(designAttributes({ accent: "red;}body{display:none" } as never)).toBeNull();
    expect(SectionDesign.safeParse({ bg: "url(javascript:1)" }).success).toBe(false);
  });

  it("ships valid presets", () => {
    for (const preset of DESIGN_PRESETS) expect(SectionDesign.safeParse(preset.design).success).toBe(true);
  });
});

describe("stat parsing", () => {
  it("splits prefix, number and suffix", () => {
    expect(parseStat("4.9★")).toMatchObject({ prefix: "", number: 4.9, suffix: "★", decimals: 1 });
    expect(parseStat("$1,250+")).toMatchObject({ prefix: "$", number: 1250, suffix: "+", grouped: true });
    expect(parseStat("Many")).toBeNull();
  });
});
