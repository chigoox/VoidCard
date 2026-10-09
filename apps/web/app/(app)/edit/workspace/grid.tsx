"use client";

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import {
  Section as SectionSchema,
  DESKTOP_CELL_ALIGNS,
  type DesktopCellAlign,
  type DesktopPlacement,
  type Section,
} from "@/lib/sections/types";
import {
  DESKTOP_PRESETS,
  DEVICE_COLS,
  DESKTOP_SETTING_LIMITS,
  DESKTOP_TILE_STYLES,
  applyDesktopPreset,
  applyPlacements,
  clampRect,
  clearDesktopPlacements,
  compactLayout,
  desktopLayoutCss,
  hasTileStyle,
  layoutBottom,
  resolveLayout,
  tileStyleVars,
  tileTextMode,
  type DesktopLayoutSettings,
  type DesktopPresetId,
  type LayoutDevice,
  type LayoutItem,
  type Rect,
} from "@/lib/sections/desktopLayout";
import { sectionTitle } from "./sectionMeta";

export type WorkspaceChange = { sections?: Section[]; settings?: DesktopLayoutSettings };
type Edge = "e" | "s" | "se" | "w" | "sw";

const ALIGN_LABELS: Record<DesktopCellAlign, string> = { start: "Top", center: "Middle", end: "Bottom", stretch: "Fill" };
const TILE_LABELS: Record<(typeof DESKTOP_TILE_STYLES)[number], string> = { none: "None", card: "Cards", glass: "Glass" };

// ─── Controller: layout state shared by the canvas and the inspector ────────

export function useGridController({
  sections,
  settings,
  device,
  onChange,
}: {
  sections: Section[];
  settings: DesktopLayoutSettings;
  device: LayoutDevice;
  onChange: (change: WorkspaceChange) => void;
}) {
  const cols = DEVICE_COLS[device];
  const [overflowing, setOverflowing] = useState<Record<string, number>>({});
  const resolved = useMemo(() => resolveLayout(sections, device, settings.rowHeight), [sections, device, settings.rowHeight]);
  const placedSections = useMemo(() => sections.filter((section) => resolved.has(section.id)), [sections, resolved]);

  // Tablet canvas approximates an iPad-width page with side padding.
  const canvasWidth = device === "tablet" ? 820 : settings.maxWidth;
  const gap = settings.gap;
  const rowH = settings.rowHeight;
  const colW = (canvasWidth - gap * (cols - 1)) / cols;
  const stepX = colW + gap;
  const stepY = rowH + gap;

  const commitRects = useCallback((rects: Map<string, Rect>, patch?: Partial<DesktopPlacement> & { id?: string }) => {
    const placements = new Map<string, DesktopPlacement>();
    for (const section of placedSections) {
      const rect = rects.get(section.id) ?? resolved.get(section.id);
      if (!rect) continue;
      const previous = resolved.get(section.id);
      const extra = patch && patch.id === section.id ? { ...patch } : {};
      delete (extra as { id?: string }).id;
      placements.set(section.id, {
        ...clampRect(rect, cols),
        ...(previous?.align ? { align: previous.align } : {}),
        ...(previous?.sticky ? { sticky: true } : {}),
        ...extra,
      });
    }
    onChange({ sections: applyPlacements(sections, placements, device) });
  }, [cols, device, onChange, placedSections, resolved, sections]);

  const relayout = useCallback((id: string, candidate: Rect) => {
    const items: LayoutItem[] = placedSections.map((section) => (
      section.id === id ? { id, ...clampRect(candidate, cols) } : { id: section.id, ...(resolved.get(section.id) as Rect) }
    ));
    return new Map(compactLayout(items, id, cols).map((item) => [item.id, { x: item.x, y: item.y, w: item.w, h: item.h }]));
  }, [cols, placedSections, resolved]);

  const setRect = useCallback((id: string, patch: Partial<Rect>) => {
    const origin = resolved.get(id);
    if (origin) commitRects(relayout(id, { ...origin, ...patch }));
  }, [commitRects, relayout, resolved]);

  const nudge = useCallback((id: string, delta: Partial<Rect>, resize: boolean) => {
    const o = resolved.get(id);
    if (!o) return;
    commitRects(relayout(id, resize
      ? { ...o, w: o.w + (delta.x ?? 0), h: o.h + (delta.y ?? 0) }
      : { ...o, x: o.x + (delta.x ?? 0), y: Math.max(0, o.y + (delta.y ?? 0)) }));
  }, [commitRects, relayout, resolved]);

  const setPlacementMeta = useCallback((id: string, patch: Partial<Pick<DesktopPlacement, "align" | "sticky">>) => {
    commitRects(new Map(), { id, ...patch });
  }, [commitRects]);

  const fitToContent = useCallback((id: string) => {
    const needed = overflowing[id];
    if (!needed || !resolved.get(id)) return;
    setRect(id, { h: Math.max(1, Math.ceil((needed + gap) / stepY)) });
  }, [gap, overflowing, resolved, setRect, stepY]);

  const reportOverflow = useCallback((id: string, contentHeight: number | null) => {
    setOverflowing((current) => {
      if (contentHeight === null) {
        if (!(id in current)) return current;
        const next = { ...current };
        delete next[id];
        return next;
      }
      return current[id] === contentHeight ? current : { ...current, [id]: contentHeight };
    });
  }, []);

  const applyPreset = useCallback((preset: DesktopPresetId) => {
    onChange({ sections: applyDesktopPreset(sections, preset, settings.rowHeight), settings: { ...settings, enabled: true } });
  }, [onChange, sections, settings]);

  return {
    device, cols, settings, resolved, placedSections, overflowing,
    canvasWidth, gap, rowH, colW, stepX, stepY,
    commitRects, relayout, setRect, nudge, setPlacementMeta, fitToContent, reportOverflow, applyPreset,
    updateSettings: (patch: Partial<DesktopLayoutSettings>) => onChange({ settings: { ...settings, ...patch } }),
    resetDevice: () => onChange({ sections: clearDesktopPlacements(sections, device) }),
  };
}

export type GridController = ReturnType<typeof useGridController>;

// ─── Canvas ──────────────────────────────────────────────────────────────────

type Interaction =
  | { kind: "move"; id: string; pointerId: number; startX: number; startY: number; origin: Rect; offsetX: number; offsetY: number }
  | { kind: "resize"; id: string; pointerId: number; startX: number; startY: number; origin: Rect; edge: Edge };

// Tile content is expensive (embeds, galleries); only re-render when the
// section itself changes, never while its tile moves.
const TileContent = memo(function TileContent({ section }: { section: Section }) {
  const parsed = SectionSchema.safeParse(section);
  if (!parsed.success) return <div className="p-3 text-xs text-red-200">Fix this section to preview it.</div>;
  return <SectionRenderer section={parsed.data} isTop={false} topBleedOffset="none" />;
});

export function GridCanvas({
  controller: c,
  selectedId,
  onSelect,
  themeCss,
  customCss,
}: {
  controller: GridController;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  themeCss: string;
  customCss: string;
}) {
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [draft, setDraft] = useState<Map<string, Rect> | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [available, setAvailable] = useState(1000);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => { if (entry) setAvailable(entry.contentRect.width); });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scale = Math.min(1, Math.max(0.25, (available - 32) / c.canvasWidth));
  const rectOf = (id: string): Rect | undefined => draft?.get(id) ?? c.resolved.get(id);
  const toPx = (rect: Rect) => ({
    left: rect.x * c.stepX,
    top: rect.y * c.stepY,
    width: rect.w * c.colW + (rect.w - 1) * c.gap,
    height: rect.h * c.rowH + (rect.h - 1) * c.gap,
  });
  const bottom = layoutBottom(c.placedSections.map((section) => rectOf(section.id)).filter(Boolean) as DesktopPlacement[]);
  const canvasHeight = Math.max(bottom + 6, 14) * c.stepY;

  function canvasPoint(event: { clientX: number; clientY: number }) {
    const box = canvasRef.current?.getBoundingClientRect();
    return box ? { x: (event.clientX - box.left) / scale, y: (event.clientY - box.top) / scale } : { x: 0, y: 0 };
  }

  function startMove(event: ReactPointerEvent, id: string) {
    if (event.button !== 0) return;
    const origin = c.resolved.get(id);
    if (!origin) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    onSelect(id);
    const point = canvasPoint(event);
    const px = toPx(origin);
    setInteraction({ kind: "move", id, pointerId: event.pointerId, startX: point.x, startY: point.y, origin, offsetX: point.x - px.left, offsetY: point.y - px.top });
    setPointer(point);
  }

  function startResize(event: ReactPointerEvent, id: string, edge: Edge) {
    if (event.button !== 0) return;
    const origin = c.resolved.get(id);
    if (!origin) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    onSelect(id);
    const point = canvasPoint(event);
    setInteraction({ kind: "resize", id, pointerId: event.pointerId, startX: point.x, startY: point.y, origin, edge });
  }

  function onPointerMove(event: ReactPointerEvent) {
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    const point = canvasPoint(event);
    const dx = point.x - interaction.startX;
    const dy = point.y - interaction.startY;
    const o = interaction.origin;
    let candidate: Rect;
    if (interaction.kind === "move") {
      setPointer(point);
      candidate = { ...o, x: o.x + Math.round(dx / c.stepX), y: Math.max(0, o.y + Math.round(dy / c.stepY)) };
    } else {
      const dCols = Math.round(dx / c.stepX);
      candidate = { ...o };
      if (interaction.edge.includes("e")) candidate.w = Math.max(1, Math.min(c.cols - o.x, o.w + dCols));
      if (interaction.edge.includes("w")) {
        const x = Math.max(0, Math.min(o.x + o.w - 1, o.x + dCols));
        candidate.w = o.w + (o.x - x);
        candidate.x = x;
      }
      if (interaction.edge.includes("s")) candidate.h = Math.max(1, o.h + Math.round(dy / c.stepY));
    }
    setDraft(c.relayout(interaction.id, candidate));
  }

  function endInteraction(event: ReactPointerEvent) {
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    const finalDraft = draft;
    const moved = finalDraft && !sameRect(finalDraft.get(interaction.id), interaction.origin);
    setInteraction(null);
    setPointer(null);
    setDraft(null);
    if (finalDraft && moved) c.commitRects(finalDraft);
  }

  // Keyboard: arrows move the selected tile, Shift+arrows resize, F fits.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if (!selectedId || !c.resolved.has(selectedId)) return;
      const delta = ({ ArrowLeft: { x: -1 }, ArrowRight: { x: 1 }, ArrowUp: { y: -1 }, ArrowDown: { y: 1 } } as Record<string, Partial<Rect>>)[event.key];
      if (delta) {
        event.preventDefault();
        c.nudge(selectedId, delta, event.shiftKey);
      } else if (event.key === "Escape") {
        onSelect(null);
      } else if (event.key.toLowerCase() === "f" && !event.metaKey && !event.ctrlKey) {
        c.fitToContent(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div
      ref={viewportRef}
      className="relative h-full min-h-0 overflow-auto p-4"
      onPointerDown={(event) => { if (event.target === event.currentTarget) onSelect(null); }}
      data-testid="grid-canvas-viewport"
    >
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      <style dangerouslySetInnerHTML={{ __html: desktopLayoutCss({ ...c.settings, enabled: true }) }} />
      {customCss ? <style dangerouslySetInnerHTML={{ __html: customCss }} /> : null}
      <div style={{ width: c.canvasWidth * scale, height: canvasHeight * scale }} className="mx-auto">
        <div
          ref={canvasRef}
          className="vc-profile-shell vc-desktop-on relative origin-top-left"
          style={{
            width: c.canvasWidth,
            height: canvasHeight,
            transform: `scale(${scale})`,
            background: "var(--vc-bg, #0a0a0a)",
            color: "var(--vc-fg, #f7f3ea)",
            borderRadius: 18,
            boxShadow: "0 40px 120px -40px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.06)",
          }}
          onPointerMove={onPointerMove}
          onPointerUp={endInteraction}
          onPointerCancel={endInteraction}
          onPointerDown={(event) => { if (event.target === event.currentTarget) onSelect(null); }}
          data-testid="desktop-canvas"
        >
          <div className="vc-profile vc-profile-preview absolute inset-0" style={{ maxWidth: "none", background: "transparent" }}>
            {interaction ? (
              <div className="pointer-events-none absolute inset-0 flex" style={{ gap: c.gap }}>
                {Array.from({ length: c.cols }).map((_, index) => (
                  <div key={index} className="h-full flex-1 rounded-md bg-[color-mix(in_srgb,var(--vc-accent,#d4a853)_7%,transparent)]" />
                ))}
              </div>
            ) : null}
            {interaction && draft?.get(interaction.id) ? (
              <div
                className="pointer-events-none absolute rounded-xl border-2 border-dashed border-[var(--vc-accent,#d4a853)] bg-[color-mix(in_srgb,var(--vc-accent,#d4a853)_12%,transparent)] transition-all duration-100"
                style={toPx(draft.get(interaction.id)!)}
              />
            ) : null}
            {c.placedSections.map((section) => {
              const rect = rectOf(section.id)!;
              const placement = c.resolved.get(section.id);
              const isActive = interaction?.id === section.id;
              const following = isActive && interaction?.kind === "move" && pointer;
              const style: CSSProperties = following
                ? { left: pointer.x - interaction.offsetX, top: pointer.y - interaction.offsetY, width: toPx(interaction.origin).width, height: toPx(interaction.origin).height, zIndex: 40 }
                : { ...toPx(rect), zIndex: selectedId === section.id ? 30 : 10 };
              return (
                <Tile
                  key={section.id}
                  section={section}
                  style={style}
                  align={placement?.align ?? "start"}
                  sticky={!!placement?.sticky}
                  selected={selectedId === section.id}
                  lifted={!!following}
                  animate={!isActive}
                  overflowBy={c.overflowing[section.id]}
                  onReportOverflow={c.reportOverflow}
                  onPointerDown={(event) => startMove(event, section.id)}
                  onResizeStart={(event, edge) => startResize(event, section.id, edge)}
                  onFit={() => c.fitToContent(section.id)}
                />
              );
            })}
            {c.placedSections.length === 0 ? (
              <div className="absolute inset-0 grid place-items-center text-sm text-ivory-mute">Add a section to start laying out this page.</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({
  section, style, align, sticky, selected, lifted, animate, overflowBy, onReportOverflow, onPointerDown, onResizeStart, onFit,
}: {
  section: Section;
  style: CSSProperties;
  align: DesktopCellAlign;
  sticky: boolean;
  selected: boolean;
  lifted: boolean;
  animate: boolean;
  overflowBy?: number;
  onReportOverflow: (id: string, contentHeight: number | null) => void;
  onPointerDown: (event: ReactPointerEvent) => void;
  onResizeStart: (event: ReactPointerEvent, edge: Edge) => void;
  onFit: () => void;
}) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const inner = innerRef.current;
    const content = contentRef.current;
    if (!inner || !content) return;
    const check = () => onReportOverflow(section.id, content.scrollHeight > inner.clientHeight + 2 ? content.scrollHeight : null);
    const observer = new ResizeObserver(check);
    observer.observe(inner);
    observer.observe(content);
    check();
    return () => observer.disconnect();
  }, [onReportOverflow, section.id]);

  const justify = align === "center" ? "center" : align === "end" ? "flex-end" : align === "stretch" ? "stretch" : "flex-start";

  return (
    <div
      className={["vc-cell group absolute touch-none select-none", animate ? "transition-[left,top,width,height] duration-150 ease-out" : "", lifted ? "cursor-grabbing" : "cursor-grab"].join(" ")}
      style={{ ...tileStyleVars(section.layout?.tile), ...style } as CSSProperties}
      onPointerDown={onPointerDown}
      data-tile={hasTileStyle(section.layout?.tile) ? "" : undefined}
      data-tile-text={tileTextMode(section.layout?.tile)}
      data-testid="desktop-tile"
      data-section-id={section.id}
      data-section-type={section.type}
      aria-selected={selected}
    >
      <div ref={innerRef} className="vc-cell-inner relative h-full overflow-hidden" style={{ ["--vc-cell-justify" as string]: justify, justifyContent: justify }}>
        <div ref={contentRef} className="pointer-events-none [&_*]:pointer-events-none">
          <TileContent section={section} />
        </div>
      </div>
      <div
        className={[
          "pointer-events-none absolute -inset-[3px] rounded-[18px] border-2 transition",
          selected || lifted ? "border-[var(--vc-accent,#d4a853)]" : "border-dashed border-white/[0.14] bg-white/[0.015] group-hover:border-solid group-hover:border-white/30",
          lifted ? "shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]" : "",
        ].join(" ")}
      />
      <div className="pointer-events-none absolute left-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100 group-aria-selected:opacity-100">
        <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white">{sectionTitle(section)}</span>
        {sticky ? <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">📌 pinned</span> : null}
      </div>
      {overflowBy ? (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onFit}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--vc-accent,#d4a853)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-black shadow-lg"
          title="Content is taller than this tile. It grows on the live page — click to fit the tile to it."
        >
          ↕ Fit to content
        </button>
      ) : null}
      <ResizeHandle edge="e" onStart={onResizeStart} className="-right-1.5 top-1/2 h-10 w-3 -translate-y-1/2 cursor-ew-resize" />
      <ResizeHandle edge="w" onStart={onResizeStart} className="-left-1.5 top-1/2 h-10 w-3 -translate-y-1/2 cursor-ew-resize" />
      <ResizeHandle edge="s" onStart={onResizeStart} className="-bottom-1.5 left-1/2 h-3 w-10 -translate-x-1/2 cursor-ns-resize" />
      <ResizeHandle edge="se" onStart={onResizeStart} className="-bottom-2 -right-2 h-4 w-4 cursor-nwse-resize" />
      <ResizeHandle edge="sw" onStart={onResizeStart} className="-bottom-2 -left-2 h-4 w-4 cursor-nesw-resize" />
    </div>
  );
}

function ResizeHandle({ edge, className, onStart }: { edge: Edge; className: string; onStart: (event: ReactPointerEvent, edge: Edge) => void }) {
  return (
    <div
      className={`absolute z-10 rounded-full border border-black/40 bg-[var(--vc-accent,#d4a853)] opacity-0 shadow transition group-hover:opacity-100 group-aria-selected:opacity-100 ${className}`}
      onPointerDown={(event) => onStart(event, edge)}
      aria-hidden
    />
  );
}

// ─── Inspector panels ───────────────────────────────────────────────────────

/** Size, position, alignment and pinning for the selected tile. */
export function GridLayoutPanel({ controller: c, section }: { controller: GridController; section: Section }) {
  const rect = c.resolved.get(section.id);
  if (!rect) {
    return <p className="text-sm text-ivory-mute">This section is hidden on {c.device}. Turn “Show on tablet & desktop” on to place it.</p>;
  }
  const widths: Array<[number, string]> = c.device === "tablet" ? [[2, "⅓"], [3, "½"], [4, "⅔"], [6, "Full"]] : [[3, "¼"], [4, "⅓"], [6, "½"], [8, "⅔"], [12, "Full"]];
  return (
    <div className="space-y-5">
      <Group title={`Size & position · ${c.device}`}>
        <div className="grid grid-cols-2 gap-2">
          <NumberField label="Width (cols)" value={rect.w} min={1} max={c.cols} onChange={(w) => c.setRect(section.id, { w })} />
          <NumberField label="Height (rows)" value={rect.h} min={1} max={60} onChange={(h) => c.setRect(section.id, { h })} />
          <NumberField label="Column" value={rect.x + 1} min={1} max={c.cols} onChange={(x) => c.setRect(section.id, { x: x - 1 })} />
          <NumberField label="Row" value={rect.y + 1} min={1} max={400} onChange={(y) => c.setRect(section.id, { y: y - 1 })} />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {widths.map(([w, text]) => (
            <button key={w} type="button" onClick={() => c.setRect(section.id, { w, x: Math.min(rect.x, c.cols - w) })} className={chipClass(rect.w === w)}>{text}</button>
          ))}
        </div>
        <button type="button" className="btn-ghost w-full px-3 py-2 text-xs" onClick={() => c.fitToContent(section.id)} disabled={!c.overflowing[section.id]}>
          {c.overflowing[section.id] ? "Fit height to content (F)" : "Content fits"}
        </button>
      </Group>
      <Group title="Vertical alignment">
        <div className="grid grid-cols-4 gap-1">
          {DESKTOP_CELL_ALIGNS.map((align) => (
            <button key={align} type="button" className={chipClass((rect.align ?? "start") === align)} onClick={() => c.setPlacementMeta(section.id, { align })}>
              {ALIGN_LABELS[align]}
            </button>
          ))}
        </div>
      </Group>
      <Toggle
        label="Pin while scrolling"
        hint="Stays in view as visitors scroll — great for a profile sidebar."
        checked={!!rect.sticky}
        onChange={(sticky) => c.setPlacementMeta(section.id, { sticky: sticky || undefined })}
      />
    </div>
  );
}

/** Page-wide grid settings, shown when nothing is selected. */
export function GridPagePanel({ controller: c, children }: { controller: GridController; children?: ReactNode }) {
  return (
    <div className="space-y-6">
      {!c.settings.enabled ? (
        <div className="rounded-card border border-gold/30 bg-gold/5 p-3 text-sm text-ivory-dim">
          <p className="font-medium text-ivory">Custom {c.device} layout is off</p>
          <p className="mt-1 text-xs">Visitors on larger screens currently see your phone layout. Pick a layout below or switch it on.</p>
          <button type="button" className="btn-gold mt-3 w-full px-3 py-2 text-xs" onClick={() => c.updateSettings({ enabled: true })} data-testid="grid-enable">
            Use a custom layout
          </button>
        </div>
      ) : null}
      {c.device === "desktop" ? (
        <Group title="Layouts">
          <div className="grid grid-cols-2 gap-2">
            {DESKTOP_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => c.applyPreset(preset.id)}
                className="group rounded-card border border-onyx-700 p-2 text-left transition hover:border-gold/60"
                title={preset.description}
                data-testid={`desktop-preset-${preset.id}`}
              >
                <PresetThumb preset={preset.id} />
                <span className="mt-1.5 block text-xs font-medium group-hover:text-gold">{preset.label}</span>
              </button>
            ))}
          </div>
        </Group>
      ) : (
        <Group title="Tablet layout">
          <p className="text-[11px] leading-relaxed text-ivory-mute">Tablets use a 6-column grid that follows your desktop layout until you move something here.</p>
          <button type="button" className="btn-ghost w-full px-3 py-2 text-xs" onClick={c.resetDevice}>Reset tablet to match desktop</button>
        </Group>
      )}
      <Group title="Grid">
        <RangeField label="Page width" suffix="px" value={c.settings.maxWidth} {...DESKTOP_SETTING_LIMITS.maxWidth} onChange={(maxWidth) => c.updateSettings({ maxWidth })} />
        <RangeField label="Spacing" suffix="px" value={c.settings.gap} {...DESKTOP_SETTING_LIMITS.gap} onChange={(gap) => c.updateSettings({ gap })} />
        <RangeField label="Row size" suffix="px" value={c.settings.rowHeight} {...DESKTOP_SETTING_LIMITS.rowHeight} onChange={(rowHeight) => c.updateSettings({ rowHeight })} />
        <div>
          <p className="mb-1.5 text-[11px] uppercase tracking-widest text-ivory-mute">Default tile style</p>
          <div className="grid grid-cols-3 gap-1">
            {DESKTOP_TILE_STYLES.map((tiles) => (
              <button key={tiles} type="button" className={chipClass(c.settings.tiles === tiles)} onClick={() => c.updateSettings({ tiles })}>{TILE_LABELS[tiles]}</button>
            ))}
          </div>
        </div>
        {c.settings.enabled ? (
          <label className="flex items-center justify-between gap-2 text-sm">
            Custom layout on larger screens
            <input type="checkbox" checked onChange={() => c.updateSettings({ enabled: false })} className="accent-[var(--vc-accent,#d4a853)]" data-testid="desktop-enabled-toggle" />
          </label>
        ) : null}
        <button type="button" className="btn-ghost w-full px-3 py-2 text-xs" onClick={c.resetDevice}>
          {c.device === "tablet" ? "Clear tablet layout" : "Auto-arrange everything"}
        </button>
      </Group>
      {children}
      <p className="text-[11px] leading-relaxed text-ivory-mute">
        Drag tiles to move · drag edges to resize · arrow keys nudge · Shift+arrows resize · F fits a tile to its content.
      </p>
    </div>
  );
}

function PresetThumb({ preset }: { preset: DesktopPresetId }) {
  const block = "rounded-[3px] bg-ivory/25";
  const accent = "rounded-[3px] bg-gold/60";
  switch (preset) {
    case "sidebar":
      return <div className="grid h-14 grid-cols-3 gap-1 rounded-md bg-onyx-900 p-1.5"><div className={`${accent} row-span-3`} /><div className={`${block} col-span-2`} /><div className={block} /><div className={block} /></div>;
    case "bento":
      return <div className="grid h-14 grid-cols-4 grid-rows-3 gap-1 rounded-md bg-onyx-900 p-1.5"><div className={`${accent} col-span-4`} /><div className={block} /><div className={block} /><div className={`${block} col-span-2 row-span-2`} /><div className={`${block} col-span-2`} /></div>;
    case "magazine":
      return <div className="grid h-14 grid-cols-2 grid-rows-3 gap-1 rounded-md bg-onyx-900 p-1.5"><div className={`${accent} col-span-2`} /><div className={`${block} row-span-2`} /><div className={block} /><div className={block} /></div>;
    default:
      return <div className="flex h-14 flex-col items-center gap-1 rounded-md bg-onyx-900 p-1.5"><div className={`${accent} h-4 w-2/3`} /><div className={`${block} h-2 w-2/3`} /><div className={`${block} h-2 w-2/3`} /><div className={`${block} h-2 w-2/3`} /></div>;
  }
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-ivory-mute">{title}</p>
      {children}
    </section>
  );
}

function NumberField({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] uppercase tracking-widest text-ivory-mute">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const n = Number(event.target.value);
          if (Number.isFinite(n)) onChange(Math.min(max, Math.max(min, Math.round(n))));
        }}
        className="mt-1 w-full rounded-card border border-onyx-700 bg-onyx-900 px-2.5 py-1.5 text-sm tabular-nums outline-none focus:border-gold/60"
      />
    </label>
  );
}

function RangeField({ label, value, min, max, step, suffix, onChange }: { label: string; value: number; min: number; max: number; step: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[11px] uppercase tracking-widest text-ivory-mute">
        {label}
        <span className="tabular-nums normal-case tracking-normal text-ivory-dim">{value}{suffix}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full accent-[var(--vc-accent,#d4a853)]" />
    </label>
  );
}

export function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-card border border-onyx-700 px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11px] leading-snug text-ivory-mute">{hint}</span> : null}
      </span>
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="mt-1 accent-[var(--vc-accent,#d4a853)]" />
    </label>
  );
}

export function chipClass(active: boolean) {
  return [
    "rounded-pill border px-2.5 py-1.5 text-xs transition",
    active ? "border-gold/70 bg-gold/15 text-gold" : "border-onyx-700 text-ivory-dim hover:border-gold/40 hover:text-ivory",
  ].join(" ");
}

function sameRect(a: Rect | undefined, b: Rect) {
  return !!a && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}
