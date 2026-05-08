// Style studio config is persisted as a marker block at the top of customCss.
// This avoids a DB migration and keeps everything inside the existing
// `setCustomCss` server action.

export type StyleStudio = {
  accent: string; // hex like #d4a853
  radius: number; // 0–32
  gap: number; // 8–32
  maxWidth: number; // 360–800
  fontWeight: 300 | 400 | 500 | 600 | 700;
  background: "solid" | "gradient" | "mesh";
  gradientType: "radial" | "linear" | "conic";
  gradientPosition: "top" | "center" | "bottom" | "left" | "right" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
  gradientAngle: number; // 0-360
  gradientStrength: number; // 0-40
  customGradientColors: boolean;
  gradientStart: string;
  gradientEnd: string;
  buttonShadow: boolean;
  // When true, the color overrides below are emitted to override the active
  // theme preset's --vc-* variables. When false, the palette and accent come
  // from the selected theme preset.
  customColors: boolean;
  bg: string;
  bg2: string;
  fg: string;
  fgMute: string;
  accent2: string;
};

export const DEFAULT_STYLE_STUDIO: StyleStudio = {
  accent: "#d4a853",
  radius: 14,
  gap: 12,
  maxWidth: 480,
  fontWeight: 500,
  background: "solid",
  gradientType: "radial",
  gradientPosition: "top",
  gradientAngle: 180,
  gradientStrength: 18,
  customGradientColors: false,
  gradientStart: "#d4a853",
  gradientEnd: "#f0d97e",
  buttonShadow: false,
  customColors: false,
  bg: "#0a0a0a",
  bg2: "#141414",
  fg: "#f7f3ea",
  fgMute: "#a8a39a",
  accent2: "#f0d97e",
};

const HEX_RE = /^#[0-9a-f]{3,8}$/i;

const MARKER_OPEN = "/* vc:style-studio */";
const MARKER_CLOSE = "/* /vc:style-studio */";

export function readStyleStudio(css: string): { studio: StyleStudio; rest: string } {
  const start = css.indexOf(MARKER_OPEN);
  const end = css.indexOf(MARKER_CLOSE);
  if (start === -1 || end === -1 || end < start) {
    return { studio: { ...DEFAULT_STYLE_STUDIO }, rest: css };
  }
  const block = css.slice(start, end + MARKER_CLOSE.length);
  const rest = (css.slice(0, start) + css.slice(end + MARKER_CLOSE.length)).trim();
  const studio = parseBlock(block);
  return { studio, rest };
}

export function writeStyleStudio(studio: StyleStudio, rest: string): string {
  const block = renderBlock(studio);
  const trimmed = rest.trim();
  return trimmed ? `${block}\n\n${trimmed}` : block;
}

function parseBlock(block: string): StyleStudio {
  const out: StyleStudio = { ...DEFAULT_STYLE_STUDIO };
  const grab = (key: string) => {
    const m = block.match(new RegExp(`${key}\\s*:\\s*([^;}]+)`, "i"));
    return m?.[1]?.trim();
  };
  const accent = grab("--vc-accent");
  if (accent && HEX_RE.test(accent)) out.accent = accent;
  const radius = grab("--vc-radius");
  if (radius) out.radius = clampInt(parseInt(radius, 10), 0, 32, out.radius);
  const gap = grab("--vc-gap");
  if (gap) out.gap = clampInt(parseInt(gap, 10), 0, 32, out.gap);
  const maxw = grab("--vc-max-width");
  if (maxw) out.maxWidth = clampInt(parseInt(maxw, 10), 320, 800, out.maxWidth);
  const fw = grab("--vc-font-weight");
  if (fw) {
    const n = parseInt(fw, 10);
    if ([300, 400, 500, 600, 700].includes(n)) out.fontWeight = n as StyleStudio["fontWeight"];
  }
  const bg = grab("--vc-bg-mode");
  if (bg === "gradient" || bg === "mesh" || bg === "solid") out.background = bg;
  const gradientType = grab("--vc-gradient-type");
  if (gradientType === "radial" || gradientType === "linear" || gradientType === "conic") out.gradientType = gradientType;
  const gradientPosition = grab("--vc-gradient-position");
  if (isGradientPosition(gradientPosition)) out.gradientPosition = gradientPosition;
  const gradientAngle = grab("--vc-gradient-angle");
  if (gradientAngle) out.gradientAngle = clampInt(parseInt(gradientAngle, 10), 0, 360, out.gradientAngle);
  const gradientStrength = grab("--vc-gradient-strength");
  if (gradientStrength) out.gradientStrength = clampInt(parseInt(gradientStrength, 10), 0, 40, out.gradientStrength);
  const customGradientColors = grab("--vc-custom-gradient-colors");
  if (customGradientColors === "1") out.customGradientColors = true;
  if (customGradientColors === "0") out.customGradientColors = false;
  const gradientStart = grab("--vc-gradient-start");
  if (gradientStart && HEX_RE.test(gradientStart)) out.gradientStart = gradientStart;
  const gradientEnd = grab("--vc-gradient-end");
  if (gradientEnd && HEX_RE.test(gradientEnd)) out.gradientEnd = gradientEnd;
  const shadow = grab("--vc-button-shadow");
  if (shadow === "1") out.buttonShadow = true;
  if (shadow === "0") out.buttonShadow = false;
  const enabled = grab("--vc-custom-colors");
  if (enabled === "1") out.customColors = true;
  const bgv = grab("--vc-bg");
  if (bgv && HEX_RE.test(bgv)) out.bg = bgv;
  const bg2v = grab("--vc-bg-2");
  if (bg2v && HEX_RE.test(bg2v)) out.bg2 = bg2v;
  const fgv = grab("--vc-fg");
  if (fgv && HEX_RE.test(fgv)) out.fg = fgv;
  const fgmv = grab("--vc-fg-mute");
  if (fgmv && HEX_RE.test(fgmv)) out.fgMute = fgmv;
  const a2v = grab("--vc-accent-2");
  if (a2v && HEX_RE.test(a2v)) out.accent2 = a2v;
  return out;
}

function renderBlock(s: StyleStudio): string {
  const gradientColorOverrides = s.customGradientColors
    ? [
        `  --vc-gradient-start: ${s.gradientStart};`,
        `  --vc-gradient-end: ${s.gradientEnd};`,
      ]
    : [];
  const colorOverrides = s.customColors
    ? [
        `  --vc-accent: ${s.accent};`,
        `  --vc-bg: ${s.bg};`,
        `  --vc-bg-2: ${s.bg2};`,
        `  --vc-fg: ${s.fg};`,
        `  --vc-fg-mute: ${s.fgMute};`,
        `  --vc-accent-2: ${s.accent2};`,
      ]
    : [];
  const lines = [
    MARKER_OPEN,
    ".vc-profile {",
    `  --vc-custom-colors: ${s.customColors ? 1 : 0};`,
    ...colorOverrides,
    `  --vc-radius: ${s.radius}px;`,
    `  --vc-gap: ${s.gap}px;`,
    `  --vc-max-width: ${s.maxWidth}px;`,
    `  --vc-font-weight: ${s.fontWeight};`,
    `  --vc-bg-mode: ${s.background};`,
    `  --vc-gradient-type: ${s.gradientType};`,
    `  --vc-gradient-position: ${s.gradientPosition};`,
    `  --vc-gradient-angle: ${s.gradientAngle}deg;`,
    `  --vc-gradient-strength: ${s.gradientStrength}%;`,
    `  --vc-custom-gradient-colors: ${s.customGradientColors ? 1 : 0};`,
    ...gradientColorOverrides,
    `  --vc-button-shadow: ${s.buttonShadow ? 1 : 0};`,
    `  font-weight: var(--vc-font-weight);`,
    `}`,
    `.vc-profile .vc-profile-stack > [data-vc-section] + [data-vc-section] { margin-top: var(--vc-gap); }`,
    `.vc-profile a[data-vc-link] { border-radius: var(--vc-radius); ${s.buttonShadow ? "box-shadow: 0 6px 18px -8px rgba(0,0,0,.45);" : ""} }`,
    backgroundCss(s),
    MARKER_CLOSE,
  ].filter(Boolean);
  return lines.join("\n");
}

function backgroundCss(s: StyleStudio) {
  if (s.background === "solid") return "";
  const start = "var(--vc-gradient-start, var(--vc-accent, #d4af37))";
  const end = "var(--vc-gradient-end, var(--vc-accent-2, #f0d97e))";
  const bg = "var(--vc-bg, #0a0a0a)";
  const startMix = `color-mix(in srgb, ${start} ${s.gradientStrength}%, ${bg})`;
  const endMix = `color-mix(in srgb, ${end} ${Math.max(4, Math.round(s.gradientStrength * 0.7))}%, ${bg})`;
  const position = gradientPositionCss(s.gradientPosition);
  const opposite = gradientPositionCss(oppositeGradientPosition(s.gradientPosition));

  if (s.background === "mesh") {
    return `.vc-profile { background:
          radial-gradient(at ${position}, color-mix(in srgb, ${start} ${s.gradientStrength}%, transparent) 0px, transparent 52%),
          radial-gradient(at ${opposite}, color-mix(in srgb, ${end} ${Math.max(4, Math.round(s.gradientStrength * 0.6))}%, transparent) 0px, transparent 56%),
          ${bg} !important; }`;
  }

  if (s.gradientType === "linear") {
    return `.vc-profile { background: linear-gradient(${s.gradientAngle}deg, ${startMix} 0%, ${endMix} 52%, ${bg} 100%) !important; background-position: ${position}; background-size: 140% 140%; }`;
  }
  if (s.gradientType === "conic") {
    return `.vc-profile { background: conic-gradient(from ${s.gradientAngle}deg at ${position}, ${startMix} 0deg, ${endMix} 120deg, ${bg} 280deg, ${startMix} 360deg) !important; }`;
  }
  return `.vc-profile { background: radial-gradient(120% 80% at ${position}, ${startMix} 0%, ${endMix} 45%, ${bg} 100%) !important; }`;
}

function isGradientPosition(value: string | undefined): value is StyleStudio["gradientPosition"] {
  return value === "top" || value === "center" || value === "bottom" || value === "left" || value === "right" || value === "top-left" || value === "top-right" || value === "bottom-left" || value === "bottom-right";
}

function gradientPositionCss(value: StyleStudio["gradientPosition"]) {
  switch (value) {
    case "top":
      return "50% 0%";
    case "bottom":
      return "50% 100%";
    case "left":
      return "0% 50%";
    case "right":
      return "100% 50%";
    case "top-left":
      return "0% 0%";
    case "top-right":
      return "100% 0%";
    case "bottom-left":
      return "0% 100%";
    case "bottom-right":
      return "100% 100%";
    default:
      return "50% 50%";
  }
}

function oppositeGradientPosition(value: StyleStudio["gradientPosition"]): StyleStudio["gradientPosition"] {
  switch (value) {
    case "top":
      return "bottom";
    case "bottom":
      return "top";
    case "left":
      return "right";
    case "right":
      return "left";
    case "top-left":
      return "bottom-right";
    case "top-right":
      return "bottom-left";
    case "bottom-left":
      return "top-right";
    case "bottom-right":
      return "top-left";
    default:
      return "center";
  }
}

function clampInt(v: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}
