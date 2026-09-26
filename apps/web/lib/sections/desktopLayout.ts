// Desktop layout engine shared by the public profile renderer and the editor.
//
// Per-section placements live on `section.layout.desktop` (so they travel with
// drafts, publishes, versions and A/B variants). Page-level settings are
// persisted as a marker block in customCss, like the Style Studio block, so no
// DB migration is needed.

import {
  DESKTOP_GRID_COLUMNS,
  DESKTOP_MAX_ROWS,
  type DesktopCellAlign,
  type DesktopPlacement,
  type Section,
} from "./types";

export const COLS = DESKTOP_GRID_COLUMNS;

export const DESKTOP_TILE_STYLES = ["none", "card", "glass"] as const;
export type DesktopTileStyle = (typeof DESKTOP_TILE_STYLES)[number];

export type DesktopLayoutSettings = {
  enabled: boolean;
  maxWidth: number; // 880–1600 px
  rowHeight: number; // 16–160 px minimum row track
  gap: number; // 0–48 px
  tiles: DesktopTileStyle;
};

export const DEFAULT_DESKTOP_SETTINGS: DesktopLayoutSettings = {
  enabled: false,
  maxWidth: 1200,
  rowHeight: 40,
  gap: 20,
  tiles: "none",
};

export const DESKTOP_SETTING_LIMITS = {
  maxWidth: { min: 880, max: 1600, step: 20 },
  rowHeight: { min: 16, max: 160, step: 4 },
  gap: { min: 0, max: 48, step: 2 },
} as const;

const MARKER_OPEN = "/* vc:desktop-layout";
const MARKER_CLOSE = "*/";

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function normalizeDesktopSettings(input: Partial<DesktopLayoutSettings> | null | undefined): DesktopLayoutSettings {
  const d = DEFAULT_DESKTOP_SETTINGS;
  const L = DESKTOP_SETTING_LIMITS;
  return {
    enabled: input?.enabled === true,
    maxWidth: clampNumber(input?.maxWidth, L.maxWidth.min, L.maxWidth.max, d.maxWidth),
    rowHeight: clampNumber(input?.rowHeight, L.rowHeight.min, L.rowHeight.max, d.rowHeight),
    gap: clampNumber(input?.gap, L.gap.min, L.gap.max, d.gap),
    tiles: DESKTOP_TILE_STYLES.includes(input?.tiles as DesktopTileStyle) ? (input!.tiles as DesktopTileStyle) : d.tiles,
  };
}

export function readDesktopSettings(css: string): { settings: DesktopLayoutSettings; rest: string } {
  const start = css.indexOf(MARKER_OPEN);
  if (start === -1) return { settings: { ...DEFAULT_DESKTOP_SETTINGS }, rest: css };
  const end = css.indexOf(MARKER_CLOSE, start + MARKER_OPEN.length);
  if (end === -1) return { settings: { ...DEFAULT_DESKTOP_SETTINGS }, rest: css };
  const body = css.slice(start + MARKER_OPEN.length, end).trim();
  const rest = (css.slice(0, start) + css.slice(end + MARKER_CLOSE.length)).trim();
  let parsed: Partial<DesktopLayoutSettings> | null = null;
  try {
    parsed = JSON.parse(body) as Partial<DesktopLayoutSettings>;
  } catch {
    parsed = null;
  }
  return { settings: normalizeDesktopSettings(parsed), rest };
}

export function writeDesktopSettings(settings: DesktopLayoutSettings, rest: string): string {
  const normalized = normalizeDesktopSettings(settings);
  const trimmed = rest.trim();
  // Only numbers, booleans and enum strings are serialized, so the JSON can
  // never contain a comment terminator.
  const block = `${MARKER_OPEN} ${JSON.stringify(normalized)} ${MARKER_CLOSE}`;
  return trimmed ? `${block}\n\n${trimmed}` : block;
}

// ─── Placement geometry ────────────────────────────────────────────────────

export type Rect = { x: number; y: number; w: number; h: number };
export type LayoutItem = Rect & { id: string };

export function clampRect(rect: Rect): Rect {
  const w = Math.min(COLS, Math.max(1, Math.round(rect.w)));
  const x = Math.min(COLS - w, Math.max(0, Math.round(rect.x)));
  const h = Math.min(60, Math.max(1, Math.round(rect.h)));
  const y = Math.min(DESKTOP_MAX_ROWS, Math.max(0, Math.round(rect.y)));
  return { x, y, w, h };
}

export function overlaps(a: Rect, b: Rect) {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/**
 * Resolve collisions and float items upward (vertical compaction), keeping the
 * optionally pinned item exactly where the user dropped it.
 */
export function compactLayout(items: LayoutItem[], pinnedId?: string | null): LayoutItem[] {
  const pinned = pinnedId ? items.find((item) => item.id === pinnedId) : undefined;
  const placed: LayoutItem[] = pinned ? [{ ...pinned, ...clampRect(pinned) }] : [];
  const rest = items
    .filter((item) => item.id !== pinned?.id)
    .map((item) => ({ ...item, ...clampRect(item) }))
    .sort((a, b) => a.y - b.y || a.x - b.x);

  for (const item of rest) {
    const next = { ...item };
    // Float up as far as possible.
    while (next.y > 0 && !placed.some((other) => overlaps({ ...next, y: next.y - 1 }, other))) {
      next.y -= 1;
    }
    // Push down until clear.
    let guard = 0;
    while (placed.some((other) => overlaps(next, other)) && guard < 2000) {
      const blocker = placed.filter((other) => overlaps(next, other)).reduce((a, b) => (a.y + a.h > b.y + b.h ? a : b));
      next.y = blocker.y + blocker.h;
      guard += 1;
    }
    placed.push(next);
  }

  // Preserve the caller's original ordering.
  const byId = new Map(placed.map((item) => [item.id, item]));
  return items.map((item) => byId.get(item.id)!).filter(Boolean);
}

/** Find the first free spot (row-major) that fits a w×h tile. */
export function findFreeSpot(items: Rect[], w: number, h: number, region: { x: number; w: number } = { x: 0, w: COLS }): Rect {
  const width = Math.min(w, region.w);
  for (let y = 0; y < DESKTOP_MAX_ROWS; y += 1) {
    for (let x = region.x; x + width <= region.x + region.w; x += 1) {
      const candidate = { x, y, w: width, h };
      if (!items.some((item) => overlaps(candidate, item))) return candidate;
    }
  }
  const bottom = items.reduce((max, item) => Math.max(max, item.y + item.h), 0);
  return { x: region.x, y: bottom, w: width, h };
}

/** A sensible default tile size for a section when it has no placement yet. */
export function defaultTileSize(section: Section, rowHeight = DEFAULT_DESKTOP_SETTINGS.rowHeight): { w: number; h: number } {
  const rows = (px: number) => Math.max(1, Math.ceil(px / Math.max(16, rowHeight)));
  switch (section.type) {
    case "header": return { w: 12, h: rows(360) };
    case "link":
    case "phone":
    case "email":
    case "schedule": return { w: 4, h: rows(64) };
    case "social": return { w: 6, h: rows(72) };
    case "image": return { w: 6, h: rows(320) };
    case "video":
    case "youtube": return { w: 6, h: rows(320) };
    case "spotify": return { w: 6, h: rows(160) };
    case "map": return { w: 6, h: rows(300) };
    case "embed": return { w: 6, h: rows(Math.min(section.props.height ?? 320, 900)) };
    case "form": return { w: 6, h: rows(420) };
    case "gallery": return { w: 12, h: rows(360) };
    case "markdown": return { w: 6, h: rows(200) };
    case "divider": return { w: 12, h: 1 };
    case "spacer": return { w: 12, h: rows(section.props.height ?? 24) };
    case "qr": return { w: 3, h: rows(260) };
    case "tip": return { w: 6, h: rows(200) };
    case "store": return { w: 12, h: rows(420) };
    case "booking": return { w: 12, h: rows(Math.min(section.props.height ?? 820, 1200)) };
    default: return { w: 6, h: rows(120) };
  }
}

export function isDesktopVisible(section: Section) {
  return section.visible !== false && section.layout?.hideOnDesktop !== true;
}

/**
 * Compute the placement for every desktop-visible section. Stored placements
 * win; sections without one are packed into the first free spot. The result
 * is deterministic so the editor canvas and the public page always agree.
 */
export function resolveDesktopLayout(sections: Section[], rowHeight = DEFAULT_DESKTOP_SETTINGS.rowHeight): Map<string, DesktopPlacement> {
  const visible = sections.filter(isDesktopVisible);
  const items: LayoutItem[] = [];
  const meta = new Map<string, Pick<DesktopPlacement, "align" | "sticky">>();

  for (const section of visible) {
    const stored = section.layout?.desktop;
    if (stored) {
      items.push({ id: section.id, ...clampRect(stored) });
      meta.set(section.id, { align: stored.align, sticky: stored.sticky });
    }
  }
  for (const section of visible) {
    if (section.layout?.desktop) continue;
    const size = defaultTileSize(section, rowHeight);
    items.push({ id: section.id, ...findFreeSpot(items, size.w, size.h) });
  }

  const compacted = compactLayout(items);
  const out = new Map<string, DesktopPlacement>();
  for (const item of compacted) {
    const m = meta.get(item.id);
    out.set(item.id, {
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      ...(m?.align ? { align: m.align } : {}),
      ...(m?.sticky ? { sticky: true } : {}),
    });
  }
  return out;
}

export function layoutBottom(placements: Iterable<DesktopPlacement>) {
  let bottom = 0;
  for (const p of placements) bottom = Math.max(bottom, p.y + p.h);
  return bottom;
}

/** Write resolved placements back onto sections. */
export function applyPlacements(sections: Section[], placements: Map<string, DesktopPlacement>): Section[] {
  return sections.map((section) => {
    const placement = placements.get(section.id);
    if (!placement) return section;
    return { ...section, layout: { ...section.layout, desktop: placement } } as Section;
  });
}

// ─── Presets ───────────────────────────────────────────────────────────────

export const DESKTOP_PRESETS = [
  { id: "sidebar", label: "Sidebar", description: "Profile pinned on the left, content flows on the right." },
  { id: "bento", label: "Bento", description: "Hero on top, everything else as a tiled grid." },
  { id: "magazine", label: "Magazine", description: "Hero on top, two balanced columns below." },
  { id: "wide", label: "Wide column", description: "One centered column, wider than mobile." },
] as const;
export type DesktopPresetId = (typeof DESKTOP_PRESETS)[number]["id"];

const COMPACT_TYPES = new Set<Section["type"]>(["link", "phone", "email", "schedule"]);
const FULL_TYPES = new Set<Section["type"]>(["divider", "spacer", "gallery", "store", "booking"]);

export function applyDesktopPreset(sections: Section[], preset: DesktopPresetId, rowHeight = DEFAULT_DESKTOP_SETTINGS.rowHeight): Section[] {
  const visible = sections.filter(isDesktopVisible);
  const items: LayoutItem[] = [];
  const extra = new Map<string, Pick<DesktopPlacement, "align" | "sticky">>();
  const header = visible.find((section) => section.type === "header");
  const body = visible.filter((section) => section !== header);
  const size = (section: Section) => defaultTileSize(section, rowHeight);

  if (preset === "sidebar") {
    const region = { x: 4, w: 8 };
    for (const section of body) {
      const base = size(section);
      const w = COMPACT_TYPES.has(section.type) ? 4 : 8;
      items.push({ id: section.id, ...findFreeSpot(items, w, base.h, region) });
    }
    if (header) {
      const bottom = Math.max(layoutBottom(items), size(header).h);
      items.push({ id: header.id, x: 0, y: 0, w: 4, h: bottom });
      extra.set(header.id, { sticky: true, align: "start" });
    }
  } else if (preset === "bento") {
    if (header) items.push({ id: header.id, x: 0, y: 0, w: 12, h: size(header).h });
    for (const section of body) {
      const base = size(section);
      const w = COMPACT_TYPES.has(section.type) ? 3 : FULL_TYPES.has(section.type) ? 12 : section.type === "qr" ? 3 : 6;
      items.push({ id: section.id, ...findFreeSpot(items, w, base.h) });
      if (COMPACT_TYPES.has(section.type)) extra.set(section.id, { align: "center" });
    }
  } else if (preset === "magazine") {
    if (header) items.push({ id: header.id, x: 0, y: 0, w: 12, h: size(header).h });
    const top = header ? size(header).h : 0;
    const columns = [top, top];
    for (const section of body) {
      const base = size(section);
      if (FULL_TYPES.has(section.type)) {
        const y = Math.max(...columns);
        items.push({ id: section.id, x: 0, y, w: 12, h: base.h });
        columns[0] = columns[1] = y + base.h;
        continue;
      }
      const col = columns[0] <= columns[1] ? 0 : 1;
      items.push({ id: section.id, x: col * 6, y: columns[col], w: 6, h: base.h });
      columns[col] += base.h;
    }
  } else {
    let y = 0;
    for (const section of [...(header ? [header] : []), ...body]) {
      const base = size(section);
      items.push({ id: section.id, x: 2, y, w: 8, h: base.h });
      y += base.h;
    }
  }

  const compacted = preset === "sidebar" ? items.map((item) => ({ ...item, ...clampRect(item) })) : compactLayout(items);
  const placements = new Map<string, DesktopPlacement>();
  for (const item of compacted) {
    placements.set(item.id, { x: item.x, y: item.y, w: item.w, h: item.h, ...(extra.get(item.id) ?? {}) });
  }
  return applyPlacements(sections, placements);
}

export function clearDesktopPlacements(sections: Section[]): Section[] {
  return sections.map((section) => {
    if (!section.layout?.desktop) return section;
    const { desktop: _removed, ...layout } = section.layout;
    void _removed;
    return { ...section, layout } as Section;
  });
}

// ─── Rendering helpers ─────────────────────────────────────────────────────

export const DESKTOP_BREAKPOINT_PX = 1024;

/** CSS for the public page / editor preview. Scoped to `.vc-desktop-on`. */
export function desktopLayoutCss(settings: DesktopLayoutSettings): string {
  const s = normalizeDesktopSettings(settings);
  const tile =
    s.tiles === "card"
      ? `.vc-desktop-on .vc-cell-inner{background:var(--vc-bg-2,#141414);border:1px solid color-mix(in srgb,var(--vc-accent,#d4af37) 20%,transparent);border-radius:calc(var(--vc-radius,14px) + 6px);padding:20px;box-shadow:0 24px 60px -36px rgba(0,0,0,.55)}`
      : s.tiles === "glass"
        ? `.vc-desktop-on .vc-cell-inner{background:color-mix(in srgb,var(--vc-bg-2,#141414) 55%,transparent);border:1px solid color-mix(in srgb,var(--vc-fg,#f7f3ea) 10%,transparent);border-radius:calc(var(--vc-radius,14px) + 6px);padding:20px;backdrop-filter:blur(18px) saturate(140%);-webkit-backdrop-filter:blur(18px) saturate(140%)}`
        : "";
  return [
    `.vc-cell-inner>*+*{margin-top:var(--vc-gap,.75rem)}`,
    `@media (max-width:${DESKTOP_BREAKPOINT_PX - 1}px){.vc-hide-mobile{display:none!important}}`,
    `@media (min-width:${DESKTOP_BREAKPOINT_PX}px){`,
    `.vc-hide-desktop{display:none!important}`,
    s.enabled
      ? [
          `.vc-desktop-on .vc-profile,.vc-desktop-on.vc-profile{max-width:min(100%,${s.maxWidth}px)!important}`,
          `.vc-desktop-on .vc-profile-stack{display:grid;grid-template-columns:repeat(${COLS},minmax(0,1fr));grid-auto-rows:minmax(${s.rowHeight}px,auto);gap:${s.gap}px;align-items:stretch}`,
          `.vc-desktop-on .vc-profile-stack>*+*{margin-top:0}`,
          `.vc-desktop-on .vc-profile-stack>:not(.vc-cell){grid-column:1/-1}`,
          `.vc-desktop-on .vc-cell{grid-column:var(--vc-gc);grid-row:var(--vc-gr);min-width:0;display:flex;flex-direction:column}`,
          `.vc-desktop-on .vc-cell-inner{flex:1 1 auto;display:flex;flex-direction:column;justify-content:var(--vc-cell-justify,flex-start);min-width:0}`,
          `.vc-desktop-on .vc-cell[data-sticky] .vc-cell-inner{position:sticky;top:24px;flex:0 0 auto}`,
          // Mobile edge-to-edge covers would spill into neighbouring tiles.
          `.vc-desktop-on .vc-cell [data-vc-top-bleed]{margin:0!important;padding-top:0!important}`,
          `.vc-desktop-on .vc-cell [data-vc-header-cover]{position:relative!important;width:100%!important;margin-left:0!important;margin-right:0!important;border-radius:var(--vc-radius,14px)!important}`,
          tile,
          tile ? `.vc-desktop-on .vc-cell:is([data-section-type=divider],[data-section-type=spacer]) .vc-cell-inner{background:none;border:0;box-shadow:none;padding:0;backdrop-filter:none}` : "",
        ].join("")
      : "",
    `}`,
  ].join("");
}

const JUSTIFY: Record<DesktopCellAlign, string> = {
  start: "flex-start",
  center: "center",
  end: "flex-end",
  stretch: "stretch",
};

export function cellStyleVars(placement: DesktopPlacement, bottom: number): Record<string, string> {
  const rowEnd = placement.sticky ? Math.max(bottom, placement.y + placement.h) + 1 : placement.y + placement.h + 1;
  return {
    "--vc-gc": `${placement.x + 1} / span ${placement.w}`,
    "--vc-gr": `${placement.y + 1} / ${rowEnd}`,
    "--vc-cell-justify": JUSTIFY[placement.align ?? "start"],
  };
}

export function visibilityClassName(section: Section) {
  return [
    section.layout?.hideOnDesktop ? "vc-hide-desktop" : "",
    section.layout?.hideOnMobile ? "vc-hide-mobile" : "",
  ].filter(Boolean).join(" ");
}
