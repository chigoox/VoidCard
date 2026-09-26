// Premium per-section design. `section.design` is schema-validated (hex
// colours, enums, bounded numbers), then turned into data attributes plus CSS
// custom properties that the `.vc-design` rules in globals.css consume.

import { SectionDesign, type SectionDesign as SectionDesignValue } from "./types";

export type DesignAttributes = {
  className: string;
  style: Record<string, string>;
  data: Record<string, string>;
};

const SCALE: Record<NonNullable<SectionDesignValue["scale"]>, string> = { sm: "0.9", md: "1", lg: "1.15", xl: "1.32" };
const SPEED: Record<NonNullable<SectionDesignValue["speed"]>, string> = { slow: "1.6", normal: "1", fast: "0.6" };

export function hasDesign(design: SectionDesignValue | undefined): design is SectionDesignValue {
  if (!design) return false;
  return Object.entries(design).some(([key, value]) => key !== "preset" && value !== undefined && value !== "none" && value !== "inherit");
}

export function designAttributes(input: SectionDesignValue | undefined): DesignAttributes | null {
  if (!hasDesign(input)) return null;
  const parsed = SectionDesign.safeParse(input);
  if (!parsed.success) return null;
  const d = parsed.data;
  const style: Record<string, string> = {};
  const data: Record<string, string> = {};

  if (d.surface && d.surface !== "none") data["data-vc-surface"] = d.surface;
  if (d.shadow && d.shadow !== "none") data["data-vc-shadow"] = d.shadow;
  if (d.hover && d.hover !== "none") data["data-vc-hover"] = d.hover;
  if (d.ambient && d.ambient !== "none") data["data-vc-ambient"] = d.ambient;
  if (d.align) data["data-vc-align"] = d.align;
  if (d.font && d.font !== "inherit") data["data-vc-font"] = d.font;
  if (d.uppercase) data["data-vc-upper"] = "";

  if (d.accent) style["--vc-accent"] = d.accent;
  if (d.text) {
    style["--vc-fg"] = d.text;
    style["--vc-fg-mute"] = `color-mix(in srgb, ${d.text} 72%, transparent)`;
  }
  if (d.bg) {
    const angle = d.gradientAngle ?? 135;
    style["--vc-design-bg"] = d.bg2 ? `linear-gradient(${angle}deg, ${d.bg}, ${d.bg2})` : d.bg;
    data["data-vc-bg"] = "";
  }
  if (d.border) style["--vc-design-border"] = d.border;
  if (d.borderWidth !== undefined) style["--vc-design-border-w"] = `${d.borderWidth}px`;
  if (d.radius !== undefined) style["--vc-design-radius"] = `${d.radius}px`;
  if (d.padding !== undefined) style["--vc-design-pad"] = `${d.padding}px`;
  if (d.scale) style["--vc-design-scale"] = SCALE[d.scale];
  if (d.letterSpacing !== undefined) style["--vc-design-tracking"] = `${d.letterSpacing / 100}em`;
  if (d.speed) style["--vc-design-speed"] = SPEED[d.speed];
  if (d.media?.image || d.media?.video) {
    data["data-vc-media"] = "";
    style["--vc-media-scrim"] = String((d.media.overlay ?? 40) / 100);
    if (d.media.minHeight) style["--vc-media-min-h"] = `${d.media.minHeight}px`;
    // Media is usually dark behind text; default to light text unless set.
    if (!d.text) {
      style["--vc-fg"] = "#ffffff";
      style["--vc-fg-mute"] = "rgba(255,255,255,0.82)";
    }
  }

  return { className: "vc-design", style, data };
}

export function speedMultiplier(design: SectionDesignValue | undefined) {
  return design?.speed ? Number(SPEED[design.speed]) : 1;
}

// ─── Luxe presets: one-click starting points ─────────────────────────────────

export type DesignPreset = { id: string; name: string; description: string; design: SectionDesignValue };

export const DESIGN_PRESETS: DesignPreset[] = [
  {
    id: "gold-foil",
    name: "Gold Foil",
    description: "Animated gold edge, soft glow, lifts on hover.",
    design: { surface: "foil", shadow: "glow", hover: "lift", ambient: "border-flow", accent: "#d4a853", radius: 22, padding: 24 },
  },
  {
    id: "midnight-glass",
    name: "Midnight Glass",
    description: "Frosted glass with a cursor spotlight.",
    design: { surface: "spotlight", shadow: "lift", hover: "tilt", radius: 24, padding: 24 },
  },
  {
    id: "ivory-editorial",
    name: "Ivory Editorial",
    description: "Serif type, generous space, hairline border.",
    design: { surface: "outline", font: "display", scale: "lg", align: "start", radius: 4, padding: 32, letterSpacing: -1 },
  },
  {
    id: "neon-noir",
    name: "Neon Noir",
    description: "Electric glow and a breathing pulse.",
    design: { surface: "outline", shadow: "glow", ambient: "breathe", hover: "glow", accent: "#22d3ee", border: "#22d3ee", borderWidth: 1, radius: 18, padding: 22, font: "mono" },
  },
  {
    id: "aurora",
    name: "Aurora",
    description: "Slow-moving colour field behind the content.",
    design: { surface: "gradient", ambient: "aurora", shadow: "soft", hover: "shine", bg: "#1e1b4b", bg2: "#831843", gradientAngle: 135, text: "#fdf4ff", accent: "#f0abfc", radius: 26, padding: 26 },
  },
  {
    id: "velvet",
    name: "Velvet",
    description: "Deep burgundy card with gold accents.",
    design: { surface: "card", shadow: "lift", hover: "press", bg: "#3b0a17", bg2: "#1a0409", gradientAngle: 160, text: "#fbe9d0", accent: "#e8c07d", radius: 20, padding: 26, font: "display" },
  },
  {
    id: "float-card",
    name: "Floating Card",
    description: "Gently floats with a soft lifted shadow.",
    design: { surface: "card", shadow: "lift", ambient: "float", hover: "lift", radius: 24, padding: 22 },
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "No chrome — just the content.",
    design: { surface: "none", shadow: "none", hover: "none", ambient: "none" },
  },
];
