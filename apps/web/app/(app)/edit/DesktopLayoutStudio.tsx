"use client";

// Loaded with next/dynamic({ ssr: false }), so `document` is always available.

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import {
  Section as SectionSchema,
  DESKTOP_CELL_ALIGNS,
  type DesktopCellAlign,
  type DesktopPlacement,
  type Section,
} from "@/lib/sections/types";
import {
  COLS,
  DESKTOP_PRESETS,
  DESKTOP_SETTING_LIMITS,
  DESKTOP_TILE_STYLES,
  applyDesktopPreset,
  applyPlacements,
  clampRect,
  clearDesktopPlacements,
  compactLayout,
  desktopLayoutCss,
  layoutBottom,
  resolveDesktopLayout,
  type DesktopLayoutSettings,
  type DesktopPresetId,
  type LayoutItem,
  type Rect,
} from "@/lib/sections/desktopLayout";

export type DesktopStudioChange = { sections?: Section[]; settings?: DesktopLayoutSettings };

type Interaction =
  | { kind: "move"; id: string; pointerId: number; startX: number; startY: number; origin: Rect; offsetX: number; offsetY: number }
  | { kind: "resize"; id: string; pointerId: number; startX: number; startY: number; origin: Rect; edge: "e" | "s" | "se" | "w" | "sw" };

const ALIGN_LABELS: Record<DesktopCellAlign, string> = { start: "Top", center: "Middle", end: "Bottom", stretch: "Fill" };
const TILE_LABELS: Record<(typeof DESKTOP_TILE_STYLES)[number], string> = { none: "None", card: "Cards", glass: "Glass" };

function sectionLabel(section: Section): string {
  switch (section.type) {
    case "header": return section.props.name || "Header";
    case "link": return section.props.label || "Link";
    case "phone": return section.props.label || "Phone";
    case "email": return section.props.label || "Email";
    case "store": return section.props.title || "Store";
    case "form": return section.props.title || "Form";
    case "markdown": return section.props.md.split("\n")[0]?.replace(/^#+\s*/, "").slice(0, 40) || "Text";
    default: return section.type.charAt(0).toUpperCase() + section.type.slice(1);
  }
}

// Tile content is expensive (embeds, galleries); only re-render when the
// section itself changes, never while its tile moves.
const TileContent = memo(function TileContent({ section }: { section: Section }) {
  const parsed = SectionSchema.safeParse(section);
  if (!parsed.success) {
    return <div className="p-3 text-xs text-red-200">Fix this section in the editor to preview it.</div>;
  }
  return <SectionRenderer section={parsed.data} isTop={false} topBleedOffset="none" />;
});

export default function DesktopLayoutStudio({
  sections,
  settings,
  themeCss,
  customCss,
  onChange,
  onClose,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  publicUrl,
}: {
  sections: Section[];
  settings: DesktopLayoutSettings;
  themeCss: string;
  customCss: string;
  onChange: (change: DesktopStudioChange) => void;
  onClose: () => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  publicUrl?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [interaction, setInteraction] = useState<Interaction | null>(null);
  const [draft, setDraft] = useState<Map<string, Rect> | null>(null);
  const [pointer, setPointer] = useState<{ x: number; y: number } | null>(null);
  const [overflowing, setOverflowing] = useState<Record<string, number>>({});
  const [available, setAvailable] = useState(1000);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  // Lock page scroll while the studio is open.
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, []);

  useLayoutEffect(() => {
    const node = viewportRef.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setAvailable(entry.contentRect.width);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const resolved = useMemo(() => resolveDesktopLayout(sections, settings.rowHeight), [sections, settings.rowHeight]);
  const desktopSections = useMemo(() => sections.filter((section) => resolved.has(section.id)), [sections, resolved]);
  const hiddenOnDesktop = useMemo(
    () => sections.filter((section) => section.visible !== false && section.layout?.hideOnDesktop),
    [sections],
  );

  const canvasWidth = settings.maxWidth;
  const scale = Math.min(1, Math.max(0.3, (available - 48) / canvasWidth));
  const gap = settings.gap;
  const rowH = settings.rowHeight;
  const colW = (canvasWidth - gap * (COLS - 1)) / COLS;
  const stepX = colW + gap;
  const stepY = rowH + gap;

  const rectOf = useCallback((id: string): Rect | undefined => draft?.get(id) ?? resolved.get(id), [draft, resolved]);
  const toPx = useCallback((rect: Rect) => ({
    left: rect.x * stepX,
    top: rect.y * stepY,
    width: rect.w * colW + (rect.w - 1) * gap,
    height: rect.h * rowH + (rect.h - 1) * gap,
  }), [colW, gap, rowH, stepX, stepY]);

  const bottom = useMemo(() => {
    const rects = desktopSections.map((section) => rectOf(section.id)).filter(Boolean) as Rect[];
    return layoutBottom(rects as DesktopPlacement[]);
  }, [desktopSections, rectOf]);
  const canvasRows = Math.max(bottom + 6, 16);
  const canvasHeight = canvasRows * stepY;

  const selected = selectedId ? sections.find((section) => section.id === selectedId) ?? null : null;
  const selectedRect = selectedId ? rectOf(selectedId) : undefined;
  const selectedPlacement = selectedId ? resolved.get(selectedId) : undefined;

  // Persist a full set of placements so the layout stays stable once edited.
  const commitRects = useCallback((rects: Map<string, Rect>, patch?: Partial<DesktopPlacement> & { id?: string }) => {
    const placements = new Map<string, DesktopPlacement>();
    for (const section of desktopSections) {
      const rect = rects.get(section.id) ?? resolved.get(section.id);
      if (!rect) continue;
      const previous = resolved.get(section.id);
      placements.set(section.id, {
        ...clampRect(rect),
        ...(previous?.align ? { align: previous.align } : {}),
        ...(previous?.sticky ? { sticky: true } : {}),
        ...(patch && patch.id === section.id ? stripId(patch) : {}),
      });
    }
    onChange({ sections: applyPlacements(sections, placements) });
  }, [desktopSections, onChange, resolved, sections]);

  function currentItems(): LayoutItem[] {
    return desktopSections.map((section) => ({ id: section.id, ...(resolved.get(section.id) as Rect) }));
  }

  function relayout(id: string, candidate: Rect) {
    const items = currentItems().map((item) => (item.id === id ? { id, ...clampRect(candidate) } : item));
    return new Map(compactLayout(items, id).map((item) => [item.id, { x: item.x, y: item.y, w: item.w, h: item.h }]));
  }

  function canvasPoint(event: { clientX: number; clientY: number }) {
    const box = canvasRef.current?.getBoundingClientRect();
    if (!box) return { x: 0, y: 0 };
    return { x: (event.clientX - box.left) / scale, y: (event.clientY - box.top) / scale };
  }

  function startMove(event: ReactPointerEvent, id: string) {
    if (event.button !== 0) return;
    const origin = resolved.get(id);
    if (!origin) return;
    event.preventDefault();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setSelectedId(id);
    const point = canvasPoint(event);
    const px = toPx(origin);
    setInteraction({ kind: "move", id, pointerId: event.pointerId, startX: point.x, startY: point.y, origin, offsetX: point.x - px.left, offsetY: point.y - px.top });
    setPointer(point);
  }

  function startResize(event: ReactPointerEvent, id: string, edge: "e" | "s" | "se" | "w" | "sw") {
    if (event.button !== 0) return;
    const origin = resolved.get(id);
    if (!origin) return;
    event.preventDefault();
    event.stopPropagation();
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
    setSelectedId(id);
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
      candidate = { ...o, x: o.x + Math.round(dx / stepX), y: Math.max(0, o.y + Math.round(dy / stepY)) };
    } else {
      const cols = Math.round(dx / stepX);
      const rows = Math.round(dy / stepY);
      candidate = { ...o };
      if (interaction.edge.includes("e")) candidate.w = Math.max(1, Math.min(COLS - o.x, o.w + cols));
      if (interaction.edge.includes("w")) {
        const x = Math.max(0, Math.min(o.x + o.w - 1, o.x + cols));
        candidate.w = o.w + (o.x - x);
        candidate.x = x;
      }
      if (interaction.edge.includes("s")) candidate.h = Math.max(1, o.h + rows);
    }
    setDraft(relayout(interaction.id, candidate));
  }

  function endInteraction(event: ReactPointerEvent) {
    if (!interaction || event.pointerId !== interaction.pointerId) return;
    const finalDraft = draft;
    const moved = finalDraft && !sameRect(finalDraft.get(interaction.id), interaction.origin);
    setInteraction(null);
    setPointer(null);
    setDraft(null);
    if (finalDraft && moved) commitRects(finalDraft);
  }

  function nudge(id: string, delta: Partial<Rect>, resize: boolean) {
    const origin = resolved.get(id);
    if (!origin) return;
    const next = resize
      ? { ...origin, w: origin.w + (delta.x ?? 0), h: origin.h + (delta.y ?? 0) }
      : { ...origin, x: origin.x + (delta.x ?? 0), y: Math.max(0, origin.y + (delta.y ?? 0)) };
    commitRects(relayout(id, next));
  }

  function setRect(id: string, patch: Partial<Rect>) {
    const origin = resolved.get(id);
    if (!origin) return;
    commitRects(relayout(id, { ...origin, ...patch }));
  }

  function setPlacementMeta(id: string, patch: Partial<Pick<DesktopPlacement, "align" | "sticky">>) {
    commitRects(new Map(), { id, ...patch });
  }

  function fitToContent(id: string) {
    const needed = overflowing[id];
    const origin = resolved.get(id);
    if (!origin || !needed) return;
    const rows = Math.max(1, Math.ceil((needed + gap) / stepY));
    setRect(id, { h: rows });
  }

  function setVisibility(id: string, key: "hideOnDesktop" | "hideOnMobile", hidden: boolean) {
    const next = sections.map((section) => {
      if (section.id !== id) return section;
      const layout = { ...section.layout, [key]: hidden || undefined };
      if (!layout.hideOnDesktop) delete layout.hideOnDesktop;
      if (!layout.hideOnMobile) delete layout.hideOnMobile;
      return { ...section, layout } as Section;
    });
    if (key === "hideOnDesktop" && hidden && selectedId === id) setSelectedId(null);
    onChange({ sections: next });
  }

  function applyPreset(preset: DesktopPresetId) {
    onChange({
      sections: applyDesktopPreset(sections, preset, settings.rowHeight),
      settings: { ...settings, enabled: true },
    });
    setSelectedId(null);
  }

  function updateSettings(patch: Partial<DesktopLayoutSettings>) {
    onChange({ settings: { ...settings, ...patch } });
  }

  const reportOverflow = useCallback((id: string, contentHeight: number | null) => {
    setOverflowing((current) => {
      if (contentHeight === null) {
        if (!(id in current)) return current;
        const next = { ...current };
        delete next[id];
        return next;
      }
      if (current[id] === contentHeight) return current;
      return { ...current, [id]: contentHeight };
    });
  }, []);

  // Keyboard: arrows move, shift+arrows resize, Esc deselects / closes.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "SELECT" || target.tagName === "TEXTAREA")) return;
      if (event.key === "Escape") {
        event.preventDefault();
        if (selectedId) setSelectedId(null);
        else onClose();
        return;
      }
      if (!selectedId) return;
      const map: Record<string, Partial<Rect>> = {
        ArrowLeft: { x: -1 },
        ArrowRight: { x: 1 },
        ArrowUp: { y: -1 },
        ArrowDown: { y: 1 },
      };
      const delta = map[event.key];
      if (delta) {
        event.preventDefault();
        nudge(selectedId, delta, event.shiftKey);
      } else if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        fitToContent(selectedId);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const activeId = interaction?.id ?? null;
  const studioCss = desktopLayoutCss({ ...settings, enabled: true });

  return <>{createPortal(
    <div
      className="fixed inset-0 z-[120] flex flex-col bg-onyx-950 text-ivory"
      role="dialog"
      aria-modal="true"
      aria-label="Desktop layout studio"
      data-testid="desktop-studio"
    >
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      <style dangerouslySetInnerHTML={{ __html: studioCss }} />
      {customCss ? <style dangerouslySetInnerHTML={{ __html: customCss }} /> : null}

      {/* ─── Top bar ─── */}
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-onyx-700 px-4 py-3">
        <div className="mr-auto min-w-0">
          <p className="font-display text-lg text-gold-grad">Desktop layout</p>
          <p className="text-xs text-ivory-mute">
            Drag tiles to move · drag edges to resize · arrow keys nudge · Shift+arrows resize
          </p>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-pill border border-onyx-700 px-3 py-2 text-xs uppercase tracking-widest">
          <input
            type="checkbox"
            className="accent-[var(--vc-accent,#d4a853)]"
            checked={settings.enabled}
            onChange={(event) => updateSettings({ enabled: event.target.checked })}
            data-testid="desktop-enabled-toggle"
          />
          {settings.enabled ? "Live on desktop" : "Off — mobile layout on desktop"}
        </label>
        <div className="flex items-center gap-1">
          <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={onUndo} disabled={!canUndo} aria-label="Undo">Undo</button>
          <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={onRedo} disabled={!canRedo} aria-label="Redo">Redo</button>
        </div>
        <span className="hidden text-xs tabular-nums text-ivory-mute sm:inline">{Math.round(scale * 100)}%</span>
        {publicUrl ? (
          <a href={publicUrl} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-xs">View live</a>
        ) : null}
        <button type="button" className="btn-gold px-4 py-2 text-sm" onClick={onClose} data-testid="desktop-studio-done">Done</button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* ─── Canvas ─── */}
        <div
          ref={viewportRef}
          className="relative min-w-0 flex-1 overflow-auto bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px] p-6"
          onPointerDown={(event) => {
            if (event.target === event.currentTarget) setSelectedId(null);
          }}
        >
          {!settings.enabled ? (
            <div className="mx-auto mb-4 max-w-xl rounded-card border border-gold/30 bg-onyx-900/80 p-3 text-center text-sm text-ivory-dim">
              Desktop layout is off, so desktop visitors see your mobile column. Pick a preset or switch it on to publish this layout.
            </div>
          ) : null}
          <div style={{ width: canvasWidth * scale, height: canvasHeight * scale }} className="mx-auto">
            <div
              ref={canvasRef}
              className="vc-profile-shell vc-desktop-on relative origin-top-left"
              style={{
                width: canvasWidth,
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
              onPointerDown={(event) => {
                if (event.target === event.currentTarget) setSelectedId(null);
              }}
              data-testid="desktop-canvas"
            >
              <div className="vc-profile vc-profile-preview absolute inset-0" style={{ maxWidth: "none", background: "transparent" }}>
                {/* Column guides */}
                {interaction ? (
                  <div className="pointer-events-none absolute inset-0 flex" style={{ gap }}>
                    {Array.from({ length: COLS }).map((_, index) => (
                      <div key={index} className="h-full flex-1 rounded-md bg-[color-mix(in_srgb,var(--vc-accent,#d4a853)_7%,transparent)]" />
                    ))}
                  </div>
                ) : null}

                {/* Drop target placeholder */}
                {interaction && draft?.get(interaction.id) ? (
                  <div
                    className="pointer-events-none absolute rounded-xl border-2 border-dashed border-[var(--vc-accent,#d4a853)] bg-[color-mix(in_srgb,var(--vc-accent,#d4a853)_12%,transparent)] transition-all duration-100"
                    style={toPx(draft.get(interaction.id)!)}
                  />
                ) : null}

                {desktopSections.map((section) => {
                  const rect = rectOf(section.id)!;
                  const placement = resolved.get(section.id);
                  const px = toPx(interaction?.kind === "resize" && interaction.id === section.id ? rect : rect);
                  const isActive = activeId === section.id;
                  const isSelected = selectedId === section.id;
                  const following = isActive && interaction?.kind === "move" && pointer;
                  const style: CSSProperties = following
                    ? {
                        left: pointer.x - interaction.offsetX,
                        top: pointer.y - interaction.offsetY,
                        width: toPx(interaction.origin).width,
                        height: toPx(interaction.origin).height,
                        zIndex: 40,
                      }
                    : { ...px, zIndex: isSelected ? 30 : 10 };
                  return (
                    <Tile
                      key={section.id}
                      section={section}
                      style={style}
                      align={placement?.align ?? "start"}
                      sticky={!!placement?.sticky}
                      selected={isSelected}
                      lifted={!!following}
                      animate={!isActive}
                      overflowBy={overflowing[section.id]}
                      onReportOverflow={reportOverflow}
                      onPointerDown={(event) => startMove(event, section.id)}
                      onResizeStart={(event, edge) => startResize(event, section.id, edge)}
                      onFit={() => fitToContent(section.id)}
                    />
                  );
                })}

                {desktopSections.length === 0 ? (
                  <div className="absolute inset-0 grid place-items-center text-sm text-ivory-mute">
                    Add sections in the editor to lay them out here.
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* ─── Inspector ─── */}
        <aside className="w-[300px] shrink-0 space-y-5 overflow-y-auto border-l border-onyx-700 bg-onyx-950 p-4" data-testid="desktop-inspector">
          {selected && selectedRect ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-ivory-mute">{selected.type}</p>
                  <p className="truncate font-medium">{sectionLabel(selected)}</p>
                </div>
                <button type="button" className="text-xs text-ivory-mute hover:text-ivory" onClick={() => setSelectedId(null)}>Page settings</button>
              </div>

              <InspectorGroup title="Size & position">
                <div className="grid grid-cols-2 gap-2">
                  <NumberField label="Width (cols)" value={selectedRect.w} min={1} max={COLS} onChange={(w) => setRect(selected.id, { w })} />
                  <NumberField label="Height (rows)" value={selectedRect.h} min={1} max={60} onChange={(h) => setRect(selected.id, { h })} />
                  <NumberField label="Column" value={selectedRect.x + 1} min={1} max={COLS} onChange={(x) => setRect(selected.id, { x: x - 1 })} />
                  <NumberField label="Row" value={selectedRect.y + 1} min={1} max={400} onChange={(y) => setRect(selected.id, { y: y - 1 })} />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[3, 4, 6, 8, 12].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setRect(selected.id, { w, x: Math.min(selectedRect.x, COLS - w) })}
                      className={chipClass(selectedRect.w === w)}
                    >
                      {w === 12 ? "Full" : w === 6 ? "½" : w === 4 ? "⅓" : w === 3 ? "¼" : "⅔"}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className="btn-ghost w-full px-3 py-2 text-xs"
                  onClick={() => fitToContent(selected.id)}
                  disabled={!overflowing[selected.id]}
                >
                  {overflowing[selected.id] ? "Fit height to content (F)" : "Content fits"}
                </button>
              </InspectorGroup>

              <InspectorGroup title="Vertical alignment">
                <div className="grid grid-cols-4 gap-1">
                  {DESKTOP_CELL_ALIGNS.map((align) => (
                    <button
                      key={align}
                      type="button"
                      className={chipClass((selectedPlacement?.align ?? "start") === align)}
                      onClick={() => setPlacementMeta(selected.id, { align })}
                    >
                      {ALIGN_LABELS[align]}
                    </button>
                  ))}
                </div>
              </InspectorGroup>

              <InspectorGroup title="Behaviour">
                <Toggle
                  label="Pin while scrolling"
                  hint="Stays in view as visitors scroll — great for a profile sidebar."
                  checked={!!selectedPlacement?.sticky}
                  onChange={(sticky) => setPlacementMeta(selected.id, { sticky: sticky || undefined })}
                />
                <Toggle
                  label="Show on mobile"
                  checked={!selected.layout?.hideOnMobile}
                  onChange={(show) => setVisibility(selected.id, "hideOnMobile", !show)}
                />
                <Toggle
                  label="Show on desktop"
                  checked={!selected.layout?.hideOnDesktop}
                  onChange={(show) => setVisibility(selected.id, "hideOnDesktop", !show)}
                />
              </InspectorGroup>
            </>
          ) : (
            <>
              <InspectorGroup title="Start from a preset">
                <div className="grid grid-cols-2 gap-2">
                  {DESKTOP_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => applyPreset(preset.id)}
                      className="group rounded-card border border-onyx-700 p-2 text-left transition hover:border-gold/60"
                      title={preset.description}
                      data-testid={`desktop-preset-${preset.id}`}
                    >
                      <PresetThumb preset={preset.id} />
                      <span className="mt-1.5 block text-xs font-medium group-hover:text-gold">{preset.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-ivory-mute">Presets rearrange every tile. Undo if you change your mind.</p>
              </InspectorGroup>

              <InspectorGroup title="Page">
                <RangeField label="Page width" suffix="px" value={settings.maxWidth} {...DESKTOP_SETTING_LIMITS.maxWidth} onChange={(maxWidth) => updateSettings({ maxWidth })} />
                <RangeField label="Spacing" suffix="px" value={settings.gap} {...DESKTOP_SETTING_LIMITS.gap} onChange={(value) => updateSettings({ gap: value })} />
                <RangeField label="Row size" suffix="px" value={settings.rowHeight} {...DESKTOP_SETTING_LIMITS.rowHeight} onChange={(rowHeight) => updateSettings({ rowHeight })} />
                <div>
                  <p className="mb-1.5 text-[11px] uppercase tracking-widest text-ivory-mute">Tile style</p>
                  <div className="grid grid-cols-3 gap-1">
                    {DESKTOP_TILE_STYLES.map((tiles) => (
                      <button key={tiles} type="button" className={chipClass(settings.tiles === tiles)} onClick={() => updateSettings({ tiles })}>
                        {TILE_LABELS[tiles]}
                      </button>
                    ))}
                  </div>
                </div>
              </InspectorGroup>

              {hiddenOnDesktop.length > 0 ? (
                <InspectorGroup title="Hidden on desktop">
                  <ul className="space-y-1.5">
                    {hiddenOnDesktop.map((section) => (
                      <li key={section.id} className="flex items-center justify-between gap-2 rounded-card border border-onyx-700 px-3 py-2 text-sm">
                        <span className="truncate">{sectionLabel(section)}</span>
                        <button type="button" className="text-xs text-gold hover:underline" onClick={() => setVisibility(section.id, "hideOnDesktop", false)}>Show</button>
                      </li>
                    ))}
                  </ul>
                </InspectorGroup>
              ) : null}

              <InspectorGroup title="Reset">
                <button
                  type="button"
                  className="btn-ghost w-full px-3 py-2 text-xs"
                  onClick={() => onChange({ sections: clearDesktopPlacements(sections) })}
                >
                  Clear layout (auto-arrange)
                </button>
              </InspectorGroup>

              <p className="text-[11px] leading-relaxed text-ivory-mute">
                Tip: click a tile to size it exactly, align its content, pin it while scrolling, or show it only on mobile or desktop.
                Tiles grow to fit their content on the live page.
              </p>
            </>
          )}
        </aside>
      </div>
    </div>,
    document.body,
  )}</>;
}

function Tile({
  section,
  style,
  align,
  sticky,
  selected,
  lifted,
  animate,
  overflowBy,
  onReportOverflow,
  onPointerDown,
  onResizeStart,
  onFit,
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
  onResizeStart: (event: ReactPointerEvent, edge: "e" | "s" | "se" | "w" | "sw") => void;
  onFit: () => void;
}) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const inner = innerRef.current;
    const content = contentRef.current;
    if (!inner || !content) return;
    const check = () => {
      const needed = content.scrollHeight;
      onReportOverflow(section.id, needed > inner.clientHeight + 2 ? needed : null);
    };
    const observer = new ResizeObserver(check);
    observer.observe(inner);
    observer.observe(content);
    check();
    return () => observer.disconnect();
  }, [onReportOverflow, section.id]);

  const justify = align === "center" ? "center" : align === "end" ? "flex-end" : align === "stretch" ? "stretch" : "flex-start";

  return (
    <div
      className={[
        "vc-cell group absolute touch-none select-none",
        animate ? "transition-[left,top,width,height] duration-150 ease-out" : "",
        lifted ? "cursor-grabbing" : "cursor-grab",
      ].join(" ")}
      style={style}
      onPointerDown={onPointerDown}
      data-testid="desktop-tile"
      data-section-id={section.id}
      data-section-type={section.type}
      aria-selected={selected}
    >
      <div
        ref={innerRef}
        className="vc-cell-inner relative h-full overflow-hidden"
        style={{ ["--vc-cell-justify" as string]: justify, justifyContent: justify }}
      >
        <div ref={contentRef} className="pointer-events-none [&_*]:pointer-events-none">
          <TileContent section={section} />
        </div>
      </div>

      {/* Selection chrome */}
      <div
        className={[
          "pointer-events-none absolute -inset-[3px] rounded-[18px] border-2 transition",
          selected || lifted
            ? "border-[var(--vc-accent,#d4a853)]"
            : "border-dashed border-white/[0.14] bg-white/[0.015] group-hover:border-solid group-hover:border-white/30",
          lifted ? "shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]" : "",
        ].join(" ")}
      />
      <div className="pointer-events-none absolute left-2 top-2 flex gap-1 opacity-0 transition group-hover:opacity-100 group-aria-selected:opacity-100">
        <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] uppercase tracking-widest text-white">{sectionLabel(section)}</span>
        {sticky ? <span className="rounded-full bg-black/70 px-2 py-0.5 text-[10px] text-white">📌 pinned</span> : null}
      </div>
      {overflowBy ? (
        <button
          type="button"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onFit}
          className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-[var(--vc-accent,#d4a853)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-black shadow-lg"
          title="Content is taller than this tile. It will grow on the live page — click to fit the tile to it."
        >
          ↕ Fit to content
        </button>
      ) : null}

      {/* Resize handles */}
      <ResizeHandle edge="e" onStart={onResizeStart} className="-right-1.5 top-1/2 h-10 w-3 -translate-y-1/2 cursor-ew-resize" />
      <ResizeHandle edge="w" onStart={onResizeStart} className="-left-1.5 top-1/2 h-10 w-3 -translate-y-1/2 cursor-ew-resize" />
      <ResizeHandle edge="s" onStart={onResizeStart} className="-bottom-1.5 left-1/2 h-3 w-10 -translate-x-1/2 cursor-ns-resize" />
      <ResizeHandle edge="se" onStart={onResizeStart} className="-bottom-2 -right-2 h-4 w-4 cursor-nwse-resize" />
      <ResizeHandle edge="sw" onStart={onResizeStart} className="-bottom-2 -left-2 h-4 w-4 cursor-nesw-resize" />
    </div>
  );
}

function ResizeHandle({
  edge,
  className,
  onStart,
}: {
  edge: "e" | "s" | "se" | "w" | "sw";
  className: string;
  onStart: (event: ReactPointerEvent, edge: "e" | "s" | "se" | "w" | "sw") => void;
}) {
  return (
    <div
      className={`absolute z-10 rounded-full border border-black/40 bg-[var(--vc-accent,#d4a853)] opacity-0 shadow transition group-hover:opacity-100 group-aria-selected:opacity-100 ${className}`}
      onPointerDown={(event) => onStart(event, edge)}
      aria-hidden
    />
  );
}

function PresetThumb({ preset }: { preset: DesktopPresetId }) {
  const block = "rounded-[3px] bg-ivory/25";
  const accent = "rounded-[3px] bg-gold/60";
  switch (preset) {
    case "sidebar":
      return (
        <div className="grid h-14 grid-cols-3 gap-1 rounded-md bg-onyx-900 p-1.5">
          <div className={`${accent} row-span-3`} />
          <div className={`${block} col-span-2`} />
          <div className={block} /><div className={block} />
        </div>
      );
    case "bento":
      return (
        <div className="grid h-14 grid-cols-4 grid-rows-3 gap-1 rounded-md bg-onyx-900 p-1.5">
          <div className={`${accent} col-span-4`} />
          <div className={block} /><div className={block} /><div className={`${block} col-span-2 row-span-2`} />
          <div className={`${block} col-span-2`} />
        </div>
      );
    case "magazine":
      return (
        <div className="grid h-14 grid-cols-2 grid-rows-3 gap-1 rounded-md bg-onyx-900 p-1.5">
          <div className={`${accent} col-span-2`} />
          <div className={`${block} row-span-2`} /><div className={block} /><div className={block} />
        </div>
      );
    default:
      return (
        <div className="flex h-14 flex-col items-center gap-1 rounded-md bg-onyx-900 p-1.5">
          <div className={`${accent} h-4 w-2/3`} />
          <div className={`${block} h-2 w-2/3`} /><div className={`${block} h-2 w-2/3`} /><div className={`${block} h-2 w-2/3`} />
        </div>
      );
  }
}

function InspectorGroup({ title, children }: { title: string; children: React.ReactNode }) {
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
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full accent-[var(--vc-accent,#d4a853)]"
      />
    </label>
  );
}

function Toggle({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-3 rounded-card border border-onyx-700 px-3 py-2.5">
      <span className="min-w-0">
        <span className="block text-sm">{label}</span>
        {hint ? <span className="mt-0.5 block text-[11px] leading-snug text-ivory-mute">{hint}</span> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-1 accent-[var(--vc-accent,#d4a853)]"
      />
    </label>
  );
}

function chipClass(active: boolean) {
  return [
    "rounded-pill border px-2.5 py-1.5 text-xs transition",
    active ? "border-gold/70 bg-gold/15 text-gold" : "border-onyx-700 text-ivory-dim hover:border-gold/40 hover:text-ivory",
  ].join(" ");
}

function sameRect(a: Rect | undefined, b: Rect) {
  return !!a && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function stripId<T extends { id?: string }>(value: T): Omit<T, "id"> {
  const { id: _id, ...rest } = value;
  void _id;
  return rest;
}
