import { describe, expect, it } from "vitest";
import {
  applyDesktopPreset,
  clearDesktopPlacements,
  compactLayout,
  DEFAULT_DESKTOP_SETTINGS,
  overlaps,
  readDesktopSettings,
  resolveDesktopLayout,
  resolveTabletLayout,
  tileStyleVars,
  writeDesktopSettings,
} from "./desktopLayout";
import { Sections, type Section } from "./types";

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;

function sample(): Section[] {
  return Sections.parse([
    { id: id(1), type: "header", props: { name: "Ada" } },
    { id: id(2), type: "link", props: { label: "Site", url: "https://example.com" } },
    { id: id(3), type: "link", props: { label: "Blog", url: "https://example.com/blog" } },
    { id: id(4), type: "image", props: { src: "https://example.com/a.png" } },
    { id: id(5), type: "gallery", props: { images: [] } },
    { id: id(6), type: "markdown", props: { md: "hi" }, visible: false },
  ]);
}

function assertNoOverlaps(placements: Map<string, { x: number; y: number; w: number; h: number }>) {
  const list = [...placements.values()];
  for (let i = 0; i < list.length; i += 1) {
    for (let j = i + 1; j < list.length; j += 1) {
      expect(overlaps(list[i]!, list[j]!)).toBe(false);
    }
    expect(list[i]!.x + list[i]!.w).toBeLessThanOrEqual(12);
  }
}

describe("desktop settings block", () => {
  it("round-trips through customCss without touching the rest", () => {
    const css = writeDesktopSettings({ ...DEFAULT_DESKTOP_SETTINGS, enabled: true, gap: 30, tiles: "glass" }, ".x{color:red}");
    const { settings, rest } = readDesktopSettings(css);
    expect(settings).toMatchObject({ enabled: true, gap: 30, tiles: "glass" });
    expect(rest).toBe(".x{color:red}");
  });

  it("falls back to defaults on garbage and clamps values", () => {
    expect(readDesktopSettings("/* vc:desktop-layout nope */").settings).toEqual(DEFAULT_DESKTOP_SETTINGS);
    const css = '/* vc:desktop-layout {"enabled":true,"maxWidth":99999,"gap":-4,"tiles":"<x>"} */';
    expect(readDesktopSettings(css).settings).toMatchObject({ maxWidth: 1600, gap: 0, tiles: "none" });
  });
});

describe("section schema", () => {
  it("keeps desktop layout data through parsing", () => {
    const [section] = Sections.parse([
      { id: id(1), type: "divider", props: {}, layout: { desktop: { x: 2, y: 3, w: 4, h: 1, sticky: true }, hideOnMobile: true } },
    ]);
    expect(section!.layout).toEqual({ desktop: { x: 2, y: 3, w: 4, h: 1, sticky: true }, hideOnMobile: true });
  });
});

describe("layout engine", () => {
  it("auto-places sections without overlaps and skips hidden ones", () => {
    const placements = resolveDesktopLayout(sample());
    expect(placements.size).toBe(5);
    expect(placements.has(id(6))).toBe(false);
    assertNoOverlaps(placements);
  });

  it("keeps a pinned item in place and pushes others out of the way", () => {
    const items = [
      { id: "a", x: 0, y: 0, w: 6, h: 2 },
      { id: "b", x: 0, y: 2, w: 6, h: 2 },
      { id: "moved", x: 0, y: 1, w: 12, h: 2 },
    ];
    const out = compactLayout(items, "moved");
    const moved = out.find((item) => item.id === "moved")!;
    expect(moved).toMatchObject({ x: 0, y: 1, w: 12, h: 2 });
    for (const item of out) if (item.id !== "moved") expect(overlaps(item, moved)).toBe(false);
  });

  it.each(["sidebar", "bento", "magazine", "wide"] as const)("preset %s produces a valid layout", (preset) => {
    const next = applyDesktopPreset(sample(), preset);
    const placements = resolveDesktopLayout(next);
    assertNoOverlaps(placements);
    for (const section of next.filter((s) => s.visible !== false)) {
      expect(section.layout?.desktop).toBeDefined();
    }
  });

  it("sidebar preset pins the header on the left", () => {
    const header = applyDesktopPreset(sample(), "sidebar").find((s) => s.type === "header")!;
    expect(header.layout?.desktop).toMatchObject({ x: 0, w: 4, sticky: true });
  });

  it("clears placements", () => {
    const cleared = clearDesktopPlacements(applyDesktopPreset(sample(), "bento"));
    expect(cleared.every((s) => !s.layout?.desktop)).toBe(true);
  });
});

describe("tablet layout", () => {
  it("derives a 6-column layout from desktop without overlaps", () => {
    const sections = applyDesktopPreset(sample(), "bento");
    const tablet = resolveTabletLayout(sections);
    expect(tablet.size).toBe(5);
    for (const p of tablet.values()) expect(p.x + p.w).toBeLessThanOrEqual(6);
    assertNoOverlaps(tablet);
  });

  it("uses stored tablet placements when present", () => {
    const sections = sample().map((s) => (s.id === id(2) ? { ...s, layout: { tablet: { x: 0, y: 0, w: 6, h: 3 } } } : s)) as Section[];
    expect(resolveTabletLayout(sections).get(id(2))).toMatchObject({ x: 0, y: 0, w: 6, h: 3 });
  });

  it("presets reset tablet overrides", () => {
    const sections = sample().map((s) => ({ ...s, layout: { tablet: { x: 0, y: 0, w: 6, h: 3 } } })) as Section[];
    expect(applyDesktopPreset(sections, "wide").every((s) => !s.layout?.tablet)).toBe(true);
  });
});

describe("tile styles", () => {
  it("emits CSS variables for valid styles", () => {
    expect(tileStyleVars({ color: "#112233", image: "https://cdn.example.com/a.jpg", overlay: 40, padding: 12 })).toEqual({
      "--vc-tile-bg": "#112233",
      "--vc-tile-img": 'url("https://cdn.example.com/a.jpg")',
      "--vc-tile-ov": "0.4",
      "--vc-tile-pad": "12px",
    });
  });

  it("rejects values that could break out of CSS", () => {
    expect(tileStyleVars({ image: 'https://x.com/a.png") ; background:red' })).toEqual({});
    expect(tileStyleVars({ color: "red;}" })).toEqual({});
    expect(Sections.safeParse([{ id: id(1), type: "divider", props: {}, layout: { tile: { image: "javascript:alert(1)" } } }]).success).toBe(false);
  });
});
