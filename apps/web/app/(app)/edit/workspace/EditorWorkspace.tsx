"use client";

import { useEffect, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, GripVertical, Layers, Monitor, Smartphone, Tablet, Trash2, X } from "lucide-react";
import type { Section, SectionDesign, SectionType } from "@/lib/sections/types";
import type { DesktopLayoutSettings } from "@/lib/sections/desktopLayout";
import { TileStyleFields } from "../TileStyleFields";
import { BottomSheet } from "./BottomSheet";
import { DesignFields } from "./DesignFields";
import { GridCanvas, GridLayoutPanel, GridPagePanel, Group, Toggle, useGridController, type WorkspaceChange } from "./grid";
import { PhoneCanvas } from "./PhoneCanvas";
import { GROUPS, SECTION_META, sectionTitle } from "./sectionMeta";

export type WorkspaceDevice = "phone" | "tablet" | "desktop";
type InspectorTab = "content" | "design" | "layout";

const DEVICES: Array<{ id: WorkspaceDevice; label: string; Icon: typeof Smartphone }> = [
  { id: "phone", label: "Phone", Icon: Smartphone },
  { id: "tablet", label: "Tablet", Icon: Tablet },
  { id: "desktop", label: "Desktop", Icon: Monitor },
];

function useIsWide() {
  const [wide, setWide] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 768px)");
    const update = () => setWide(query.matches);
    const frame = requestAnimationFrame(update);
    query.addEventListener("change", update);
    return () => {
      cancelAnimationFrame(frame);
      query.removeEventListener("change", update);
    };
  }, []);
  return wide;
}

/**
 * The editor: one canvas for phone, tablet and desktop. Select anything to
 * edit its content, design and layout; drag to rearrange on every screen.
 */
export function EditorWorkspace({
  sections,
  desktopSettings,
  validationById,
  themeCss,
  customCss,
  mediaUrls,
  insertAt,
  onInsertAtChange,
  renderPreview,
  renderContentFields,
  onUpdateSection,
  onReplaceSections,
  onDesktopChange,
  onReorder,
  onMove,
  onRemove,
  onDuplicate,
  onAdd,
  onOpenTemplates,
}: {
  sections: Section[];
  desktopSettings: DesktopLayoutSettings;
  validationById: Map<string, string>;
  themeCss: string;
  customCss: string;
  mediaUrls: string[];
  insertAt: number | null;
  onInsertAtChange: (at: number | null) => void;
  renderPreview: (section: Section, index: number) => ReactNode;
  renderContentFields: (section: Section, onChange: (next: Section) => void) => ReactNode;
  onUpdateSection: (index: number, next: Section) => void;
  onReplaceSections: (next: Section[]) => void;
  onDesktopChange: (change: WorkspaceChange) => void;
  onReorder: (activeId: string, overId: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => string | undefined;
  onAdd: (type: SectionType, at: number) => string;
  onOpenTemplates: () => void;
}) {
  const wide = useIsWide();
  const [device, setDevice] = useState<WorkspaceDevice>("phone");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<InspectorTab>("content");
  const [layersOpen, setLayersOpen] = useState(false);

  const grid = useGridController({
    sections,
    settings: desktopSettings,
    device: device === "tablet" ? "tablet" : "desktop",
    onChange: onDesktopChange,
  });

  const selectedIndex = selectedId ? sections.findIndex((section) => section.id === selectedId) : -1;
  const selected = selectedIndex >= 0 ? sections[selectedIndex]! : null;

  function select(id: string | null) {
    setSelectedId(id);
    if (id && id !== selectedId) setTab(device === "phone" ? "content" : tab);
  }

  function update(next: Section) {
    const index = sections.findIndex((section) => section.id === next.id);
    if (index >= 0) onUpdateSection(index, next);
  }

  function add(type: SectionType) {
    const id = onAdd(type, insertAt ?? sections.length);
    onInsertAtChange(null);
    setSelectedId(id);
    setTab("content");
  }

  const inspector = selected ? (
    <Inspector
      section={selected}
      index={selectedIndex}
      count={sections.length}
      device={device}
      tab={tab}
      onTab={setTab}
      validation={validationById.get(selected.id)}
      mediaUrls={mediaUrls}
      onChange={update}
      onClose={() => setSelectedId(null)}
      onMove={(dir) => onMove(selectedIndex, dir)}
      onRemove={() => {
        if (window.confirm(`Delete “${sectionTitle(selected)}”? You can undo this.`)) {
          onRemove(selectedIndex);
          setSelectedId(null);
        }
      }}
      onDuplicate={() => {
        const id = onDuplicate(selectedIndex);
        if (id) setSelectedId(id);
      }}
      onApplyDesignToAll={(design) => onReplaceSections(sections.map((section) => ({ ...section, design }) as Section))}
      renderContentFields={renderContentFields}
      layoutPanel={device === "phone" ? null : <GridLayoutPanel controller={grid} section={selected} />}
    />
  ) : null;

  const layers = (
    <LayersPanel
      sections={sections}
      selectedId={selectedId}
      onSelect={(id) => { select(id); setLayersOpen(false); }}
      onReorder={onReorder}
      onToggleVisible={(section) => update({ ...section, visible: section.visible === false })}
    />
  );

  const pagePanel = device === "phone" ? (
    <div className="space-y-6">
      <Group title="Layers">{layers}</Group>
      <p className="text-[11px] leading-relaxed text-ivory-mute">
        Tap anything on the page to edit its content, design and animation. Drag the handle on the left of a section, or a layer here, to rearrange.
      </p>
    </div>
  ) : (
    <GridPagePanel controller={grid}>
      <Group title="Layers">{layers}</Group>
    </GridPagePanel>
  );

  return (
    <div className="flex h-full min-h-0 flex-col gap-3" data-testid="editor-workspace">
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div role="tablist" aria-label="Screen size" className="flex rounded-pill border border-onyx-700 bg-onyx-950/80 p-1">
          {DEVICES.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={device === id}
              onClick={() => setDevice(id)}
              className={["flex items-center gap-1.5 rounded-pill px-3 py-1.5 text-xs transition", device === id ? "bg-gold text-onyx-950" : "text-ivory-mute hover:text-ivory"].join(" ")}
              data-testid={`device-${id}`}
            >
              <Icon className="size-3.5" aria-hidden />
              {label}
            </button>
          ))}
        </div>
        {device !== "phone" && !desktopSettings.enabled ? (
          <span className="text-[11px] text-ivory-mute">Showing a preview — custom layout is off</span>
        ) : null}
        <div className="ml-auto flex items-center gap-2">
          <button type="button" className="btn-ghost inline-flex items-center gap-1.5 px-3 py-2 text-xs md:hidden" onClick={() => setLayersOpen(true)} data-testid="layers-open">
            <Layers className="size-3.5" aria-hidden /> Layers
          </button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 gap-4">
        <div
          className={[
            "min-w-0 flex-1 rounded-2xl border border-onyx-800 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.06)_1px,transparent_0)] [background-size:22px_22px]",
            device === "phone" ? "overflow-y-auto overscroll-contain p-2 pb-32 md:p-6" : "overflow-hidden",
          ].join(" ")}
          data-testid="workspace-canvas"
        >
          {device === "phone" ? (
            <PhoneCanvas
              sections={sections}
              selectedId={selectedId}
              validationById={validationById}
              onSelect={select}
              onReorder={onReorder}
              onInsert={(at) => onInsertAtChange(at)}
              onOpenTemplates={onOpenTemplates}
              renderPreview={renderPreview}
            />
          ) : (
            <GridCanvas controller={grid} selectedId={selectedId} onSelect={select} themeCss={themeCss} customCss={customCss} />
          )}
        </div>

        {wide ? (
          <aside className="card hidden w-[360px] shrink-0 overflow-y-auto overscroll-contain border border-onyx-700 bg-onyx-950/95 p-4 md:block" data-testid="inspector">
            {inspector ?? pagePanel}
          </aside>
        ) : null}
      </div>

      {!wide ? (
        <>
          <BottomSheet open={!!selected} onClose={() => setSelectedId(null)} title={selected ? sectionTitle(selected) : ""} eyebrow={selected ? SECTION_META[selected.type].label : ""} testId="section-sheet">
            {inspector}
          </BottomSheet>
          <BottomSheet open={layersOpen} onClose={() => setLayersOpen(false)} title="Layers" eyebrow="Drag to reorder" testId="layers-sheet">
            {device === "phone" ? layers : pagePanel}
          </BottomSheet>
        </>
      ) : null}

      <BottomSheet
        open={insertAt !== null}
        onClose={() => onInsertAtChange(null)}
        title="Add a section"
        eyebrow={insertAt !== null && insertAt < sections.length ? `Inserting at position ${insertAt + 1}` : "Adds to the end"}
        testId="add-sheet"
        doneLabel="Cancel"
      >
        <div className="space-y-5">
          {GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-ivory-mute">{group}</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(Object.keys(SECTION_META) as SectionType[])
                  .filter((type) => SECTION_META[type].group === group)
                  .map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => add(type)}
                      className="rounded-card border border-onyx-700 bg-onyx-950/60 p-3 text-left transition active:scale-[0.98] hover:border-gold/50"
                      data-testid={`add-${type}`}
                    >
                      <span className="block text-sm font-medium text-ivory">{SECTION_META[type].label}</span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-ivory-mute">{SECTION_META[type].hint}</span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </BottomSheet>
    </div>
  );
}

function Inspector({
  section,
  index,
  count,
  device,
  tab,
  onTab,
  validation,
  mediaUrls,
  onChange,
  onClose,
  onMove,
  onRemove,
  onDuplicate,
  onApplyDesignToAll,
  renderContentFields,
  layoutPanel,
}: {
  section: Section;
  index: number;
  count: number;
  device: WorkspaceDevice;
  tab: InspectorTab;
  onTab: (tab: InspectorTab) => void;
  validation?: string;
  mediaUrls: string[];
  onChange: (next: Section) => void;
  onClose: () => void;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  onApplyDesignToAll: (design: SectionDesign) => void;
  renderContentFields: (section: Section, onChange: (next: Section) => void) => ReactNode;
  layoutPanel: ReactNode;
}) {
  const setLayoutFlag = (key: "hideOnMobile" | "hideOnDesktop", hidden: boolean) => {
    const layout = { ...section.layout, [key]: hidden || undefined };
    if (!layout.hideOnMobile) delete layout.hideOnMobile;
    if (!layout.hideOnDesktop) delete layout.hideOnDesktop;
    onChange({ ...section, layout } as Section);
  };

  return (
    <div className="space-y-4" data-testid="section-inspector">
      <div className="hidden items-start justify-between gap-2 md:flex">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.25em] text-gold/80">{SECTION_META[section.type].label}</p>
          <p className="truncate font-display text-lg">{sectionTitle(section)}</p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full p-1.5 text-ivory-mute hover:bg-onyx-900 hover:text-ivory" aria-label="Close inspector">
          <X className="size-4" aria-hidden />
        </button>
      </div>

      <div className="grid grid-cols-5 gap-1 rounded-card border border-onyx-800 p-1">
        <Action label="Up" icon={<ArrowUp className="size-4" />} disabled={index <= 0} onClick={() => onMove(-1)} />
        <Action label="Down" icon={<ArrowDown className="size-4" />} disabled={index >= count - 1} onClick={() => onMove(1)} />
        <Action
          label={section.visible === false ? "Show" : "Hide"}
          icon={section.visible === false ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
          onClick={() => onChange({ ...section, visible: section.visible === false })}
        />
        <Action label="Copy" icon={<Copy className="size-4" />} onClick={onDuplicate} />
        <Action label="Delete" danger icon={<Trash2 className="size-4" />} onClick={onRemove} />
      </div>

      <div role="tablist" aria-label="Section editor" className="grid grid-cols-3 rounded-pill border border-onyx-700 p-1">
        {(["content", "design", "layout"] as const).map((value) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            onClick={() => onTab(value)}
            className={["rounded-pill px-3 py-1.5 text-xs capitalize transition", tab === value ? "bg-gold text-onyx-950" : "text-ivory-mute hover:text-ivory"].join(" ")}
            data-testid={`inspector-tab-${value}`}
          >
            {value}
          </button>
        ))}
      </div>

      {validation ? <p className="rounded-card border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">{validation}</p> : null}

      {tab === "content" ? renderContentFields(section, onChange) : null}
      {tab === "design" ? <DesignFields section={section} onChange={onChange} onApplyToAll={onApplyDesignToAll} /> : null}
      {tab === "layout" ? (
        <div className="space-y-6">
          {layoutPanel ?? (
            <p className="text-[11px] leading-relaxed text-ivory-mute">
              On phones sections stack in order — drag to rearrange. Switch to Tablet or Desktop above to place this section on a grid.
            </p>
          )}
          <Group title="Show on">
            <Toggle label="Phones" checked={!section.layout?.hideOnMobile} onChange={(show) => setLayoutFlag("hideOnMobile", !show)} />
            <Toggle label="Tablets & desktops" checked={!section.layout?.hideOnDesktop} onChange={(show) => setLayoutFlag("hideOnDesktop", !show)} />
          </Group>
          <Group title={device === "phone" ? "Background panel" : "Tile background"}>
            <TileStyleFields section={section} onChange={onChange} mediaUrls={mediaUrls} />
          </Group>
        </div>
      ) : null}
    </div>
  );
}

function Action({ label, icon, onClick, disabled, danger }: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={["flex flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] transition disabled:opacity-30", danger ? "text-red-300 hover:bg-red-500/10" : "text-ivory-dim hover:bg-onyx-900 hover:text-ivory"].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

function LayersPanel({
  sections,
  selectedId,
  onSelect,
  onReorder,
  onToggleVisible,
}: {
  sections: Section[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onReorder: (activeId: string, overId: string) => void;
  onToggleVisible: (section: Section) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  function onDragEnd(event: DragEndEvent) {
    if (event.over && event.active.id !== event.over.id) onReorder(String(event.active.id), String(event.over.id));
  }
  if (sections.length === 0) return <p className="text-sm text-ivory-mute">No sections yet.</p>;
  return (
    <DndContext id="layers" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
        <ul className="space-y-1.5" data-testid="section-list">
          {sections.map((section) => (
            <LayerRow key={section.id} section={section} selected={selectedId === section.id} onSelect={() => onSelect(section.id)} onToggleVisible={() => onToggleVisible(section)} />
          ))}
        </ul>
      </SortableContext>
    </DndContext>
  );
}

function LayerRow({ section, selected, onSelect, onToggleVisible }: { section: Section; selected: boolean; onSelect: () => void; onToggleVisible: () => void }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const hidden = section.visible === false;
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={[
        "flex items-center gap-2 rounded-card border px-2 py-2 text-sm transition",
        selected ? "border-gold/60 bg-gold/10" : "border-onyx-700 bg-onyx-950/60 hover:border-onyx-600",
        isDragging ? "z-10 shadow-2xl" : "",
      ].join(" ")}
      data-section-row={section.id}
    >
      <button type="button" ref={setActivatorNodeRef} {...attributes} {...listeners} className="cursor-grab touch-none rounded p-1 text-ivory-mute hover:text-ivory" aria-label={`Drag ${sectionTitle(section)}`}>
        <GripVertical className="size-4" aria-hidden />
      </button>
      <button type="button" onClick={onSelect} className={["min-w-0 flex-1 text-left", hidden ? "opacity-50" : ""].join(" ")}>
        <span className="block truncate text-ivory">{sectionTitle(section)}</span>
        <span className="block text-[10px] uppercase tracking-widest text-ivory-mute">{SECTION_META[section.type].label}</span>
      </button>
      <button type="button" onClick={onToggleVisible} className="rounded p-1 text-ivory-mute hover:text-ivory" aria-label={hidden ? "Show section" : "Hide section"}>
        {hidden ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
      </button>
    </li>
  );
}
