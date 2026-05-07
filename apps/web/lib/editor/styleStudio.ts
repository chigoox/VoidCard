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
  buttonShadow: boolean;
  // When true, the color overrides below are emitted to override the active
  // theme preset's --vc-* variables. When false, only `accent` is applied
  // (matches legacy behaviour) and the rest of the palette comes from the
  // selected theme preset.
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
  const colorOverrides = s.customColors
    ? [
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
    `  --vc-accent: ${s.accent};`,
    ...colorOverrides,
    `  --vc-radius: ${s.radius}px;`,
    `  --vc-gap: ${s.gap}px;`,
    `  --vc-max-width: ${s.maxWidth}px;`,
    `  --vc-font-weight: ${s.fontWeight};`,
    `  --vc-bg-mode: ${s.background};`,
    `  --vc-button-shadow: ${s.buttonShadow ? 1 : 0};`,
    `  font-weight: var(--vc-font-weight);`,
    `}`,
    `.vc-profile [data-vc-section] { margin-top: var(--vc-gap); }`,
    `.vc-profile [data-vc-section]:first-child { margin-top: 0; }`,
    `.vc-profile a[data-vc-link] { border-radius: var(--vc-radius); ${s.buttonShadow ? "box-shadow: 0 6px 18px -8px rgba(0,0,0,.45);" : ""} }`,
    s.background === "gradient"
      ? `.vc-profile { background: radial-gradient(120% 80% at 50% 0%, color-mix(in srgb, var(--vc-accent) 14%, var(--vc-bg)) 0%, var(--vc-bg) 60%) !important; }`
      : "",
    s.background === "mesh"
      ? `.vc-profile { background:
          radial-gradient(at 20% 0%, color-mix(in srgb, var(--vc-accent) 18%, transparent) 0px, transparent 50%),
          radial-gradient(at 80% 100%, color-mix(in srgb, var(--vc-accent) 10%, transparent) 0px, transparent 50%),
          var(--vc-bg) !important; }`
      : "",
    MARKER_CLOSE,
  ].filter(Boolean);
  return lines.join("\n");
}

function clampInt(v: number, min: number, max: number, fallback: number) {
  if (!Number.isFinite(v)) return fallback;
  return Math.max(min, Math.min(max, Math.round(v)));
}
