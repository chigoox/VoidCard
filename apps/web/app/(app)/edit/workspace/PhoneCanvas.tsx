"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { EyeOff, GripVertical, Monitor, Plus } from "lucide-react";
import type { Section } from "@/lib/sections/types";
import { SECTION_META, sectionTitle } from "./sectionMeta";

/**
 * The phone view of the page, rendered for real. Tap a section to select it,
 * drag its handle to reorder, tap + to insert.
 */
export function PhoneCanvas({
  sections,
  selectedId,
  validationById,
  onSelect,
  onReorder,
  onInsert,
  onOpenTemplates,
  renderPreview,
}: {
  sections: Section[];
  selectedId: string | null;
  validationById: Map<string, string>;
  onSelect: (id: string | null) => void;
  onReorder: (activeId: string, overId: string) => void;
  onInsert: (at: number) => void;
  onOpenTemplates: () => void;
  renderPreview: (section: Section, index: number) => ReactNode;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(event: DragEndEvent) {
    if (event.over && event.active.id !== event.over.id) onReorder(String(event.active.id), String(event.over.id));
  }

  return (
    <div
      className="vc-profile vc-profile-preview mx-auto min-h-full overflow-hidden rounded-[30px] border border-onyx-700 px-4 pb-8 pt-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)] md:max-w-[430px]"
      style={{ background: "var(--vc-bg, #0a0a0a)", color: "var(--vc-fg, #f7f3ea)" }}
      onClick={(event) => { if (event.target === event.currentTarget) onSelect(null); }}
      data-testid="mobile-canvas"
    >
      {sections.length === 0 ? (
        <div className="space-y-3 py-12 text-center">
          <p className="font-display text-2xl">Start your page</p>
          <p className="text-sm opacity-70">Pick a designed template or add your first section.</p>
          <div className="flex justify-center gap-2 pt-2">
            <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={onOpenTemplates}>Browse templates</button>
            <button type="button" className="btn-gold px-4 py-2 text-sm" onClick={() => onInsert(0)}>Add section</button>
          </div>
        </div>
      ) : null}

      <DndContext id="phone-canvas" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
          {sections.map((section, index) => (
            <div key={section.id}>
              {index > 0 ? <InsertButton onClick={() => onInsert(index)} /> : null}
              <SortableSection
                section={section}
                selected={selectedId === section.id}
                invalid={validationById.get(section.id)}
                onSelect={() => onSelect(section.id)}
              >
                {renderPreview(section, index)}
              </SortableSection>
            </div>
          ))}
        </SortableContext>
      </DndContext>

      {sections.length > 0 ? (
        <button
          type="button"
          onClick={() => onInsert(sections.length)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[color-mix(in_srgb,var(--vc-accent,#d4a853)_45%,transparent)] py-4 text-sm font-medium text-[var(--vc-accent,#d4a853)]"
          data-testid="canvas-add-end"
        >
          <Plus className="size-4" aria-hidden /> Add a section
        </button>
      ) : null}
    </div>
  );
}

function SortableSection({
  section,
  selected,
  invalid,
  onSelect,
  children,
}: {
  section: Section;
  selected: boolean;
  invalid?: string;
  onSelect: () => void;
  children: ReactNode;
}) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const hidden = section.visible === false;
  const desktopOnly = section.layout?.hideOnMobile === true;

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 50 : undefined }}
      className={[
        "group relative -mx-2 rounded-2xl px-2 py-1 outline-none transition-shadow",
        selected ? "ring-2 ring-[var(--vc-accent,#d4a853)]" : "ring-1 ring-transparent hover:ring-white/20",
        invalid ? "ring-2 ring-red-400/70" : "",
        isDragging ? "scale-[1.02] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.8)]" : "",
      ].join(" ")}
      data-testid={`canvas-section-${section.id}`}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSelect();
          }
        }}
        aria-label={`Edit ${sectionTitle(section)}`}
        className="cursor-pointer"
      >
        <div className={["pointer-events-none select-none [&_*]:pointer-events-none", hidden || desktopOnly ? "opacity-35" : ""].join(" ")}>
          {children}
        </div>
      </div>
      <button
        type="button"
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className={[
          "absolute -left-1 top-1/2 z-10 grid h-9 w-6 -translate-y-1/2 cursor-grab touch-none place-items-center rounded-md bg-black/70 text-white shadow backdrop-blur transition active:cursor-grabbing",
          selected ? "opacity-100" : "opacity-60 md:opacity-0 md:group-hover:opacity-100",
        ].join(" ")}
        aria-label={`Drag to reorder ${sectionTitle(section)}`}
        data-testid="drag-handle"
      >
        <GripVertical className="size-4" aria-hidden />
      </button>
      <span className={["pointer-events-none absolute right-3 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-white backdrop-blur transition", selected || hidden || desktopOnly || invalid ? "opacity-100" : "opacity-0 group-hover:opacity-100"].join(" ")}>
        {hidden ? <><EyeOff className="size-3" aria-hidden /> Hidden</> : desktopOnly ? <><Monitor className="size-3" aria-hidden /> Desktop only</> : invalid ? "Needs a fix" : SECTION_META[section.type].label}
      </span>
    </div>
  );
}

function InsertButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative flex h-5 items-center justify-center">
      <span className="absolute inset-x-6 top-1/2 h-px bg-[color-mix(in_srgb,var(--vc-accent,#d4a853)_16%,transparent)]" aria-hidden />
      <button
        type="button"
        onClick={onClick}
        className="relative z-10 grid size-6 place-items-center rounded-full border border-[color-mix(in_srgb,var(--vc-accent,#d4a853)_50%,transparent)] bg-[var(--vc-bg,#0a0a0a)] text-[var(--vc-accent,#d4a853)] shadow"
        aria-label="Insert a section here"
      >
        <Plus className="size-3.5" aria-hidden />
      </button>
    </div>
  );
}
