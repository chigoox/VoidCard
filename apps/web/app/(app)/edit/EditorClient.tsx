"use client";

import "client-only";

import { useState, useTransition } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveDraft, publishDraft } from "./actions";
import type { Sections } from "@/lib/sections/types";
import { SECTION_TYPES } from "@/lib/sections/types";
import { SectionRenderer } from "@/components/sections/SectionRenderer";

function SortableSectionRow({
  index,
  section,
  onMove,
  onRemove,
}: {
  index: number;
  section: Sections[number];
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={[
        "card flex items-center justify-between gap-3 p-3 text-sm",
        isDragging ? "border-gold/60 shadow-[0_8px_24px_-12px_rgba(212,168,83,0.35)]" : "",
      ].join(" ")}
      data-testid={`section-row-${section.id}`}
    >
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Drag ${section.type} section`}
          className="btn-ghost cursor-grab px-2 py-1 text-xs active:cursor-grabbing"
          data-testid={`drag-handle-${section.id}`}
          {...attributes}
          {...listeners}
        >
          ⋮⋮
        </button>
        <span className="uppercase tracking-widest text-ivory-mute">{section.type}</span>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={() => onMove(index, -1)} className="btn-ghost px-2 py-1 text-xs" aria-label="Move up">↑</button>
        <button type="button" onClick={() => onMove(index, 1)} className="btn-ghost px-2 py-1 text-xs" aria-label="Move down">↓</button>
        <button type="button" onClick={() => onRemove(index)} className="btn-ghost px-2 py-1 text-xs" aria-label="Remove">×</button>
      </div>
    </li>
  );
}

export default function EditorClient({
  initial,
  username,
  profileId,
}: {
  initial: Sections;
  username: string;
  profileId: string;
}) {
  const [sections, setSections] = useState<Sections>(initial);
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function addSection(type: typeof SECTION_TYPES[number]) {
    const id = crypto.randomUUID();
    const base = { id, type, visible: true } as const;
    let s: Sections[number];
    switch (type) {
      case "header": s = { ...base, type, props: { name: "Your name", showVerified: true } }; break;
      case "link":   s = { ...base, type, props: { label: "New link", url: "https://example.com", style: "pill" } }; break;
      case "image":  s = { ...base, type, props: { src: "https://placehold.co/600x600", alt: "", rounded: true } }; break;
      case "spotify": s = { ...base, type, props: { uri: "spotify:track:11dFghVXANMlKmJXsNCbNl" } }; break;
      case "youtube": s = { ...base, type, props: { id: "dQw4w9WgXcQ" } }; break;
      case "social": s = { ...base, type, props: { items: [{ platform: "instagram", handle: "voidluxury" }] } }; break;
      case "qr": s = { ...base, type, props: { url: `https://vcard.ed5enterprise.com/u/${username}` } }; break;
      case "schedule": s = { ...base, type, props: { provider: "calcom", url: "https://cal.com/your" } }; break;
      case "tip": s = { ...base, type, props: { stripeAccountId: "acct_xxx", amounts: [200, 500, 1000] } }; break;
      case "divider": s = { ...base, type, props: {} }; break;
      case "spacer": s = { ...base, type, props: { height: 24 } }; break;
      case "markdown": s = { ...base, type, props: { md: "Hello, world." } }; break;
      case "form": s = { ...base, type, props: { title: "Get in touch", fields: [{ name: "email", label: "Email", type: "email", required: true }], successMessage: "Thanks!", proLeadMode: false } }; break;
      case "video": s = { ...base, type, props: { src: "https://example.com/video.mp4" } }; break;
      case "map": s = { ...base, type, props: { lat: 40.7128, lng: -74.006, label: "NYC" } }; break;
      case "embed": s = { ...base, type, props: { html: "<p>Embed</p>", height: 300 } }; break;
      case "gallery": s = { ...base, type, props: { images: [{ src: "https://placehold.co/600", alt: "" }] } }; break;
    }
    setSections((prev) => [...prev, s]);
  }

  function move(index: number, dir: -1 | 1) {
    setSections((prev) => {
      const next = [...prev];
      const j = index + dir;
      if (j < 0 || j >= next.length) return prev;
      [next[index], next[j]] = [next[j], next[index]];
      return next;
    });
  }
  function remove(index: number) {
    setSections((prev) => prev.filter((_, i) => i !== index));
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setSections((prev) => {
      const oldIndex = prev.findIndex((section) => section.id === active.id);
      const newIndex = prev.findIndex((section) => section.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex);
    });
  }

  function onSave() {
    start(async () => {
      await saveDraft(sections, profileId);
      setSavedAt(new Date().toLocaleTimeString());
    });
  }
  function onPublish() {
    start(async () => {
      await saveDraft(sections, profileId);
      const res = await publishDraft(profileId);
      if (res.ok) setSavedAt("Published");
    });
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Live preview */}
      <div className="md:order-2">
        <div className="phone-frame mx-auto">
          <div className="flex h-full flex-col bg-onyx-950 p-5">
            <div className="space-y-3">
              {sections.map((s) => <SectionRenderer key={s.id} section={s} />)}
            </div>
          </div>
        </div>
      </div>

      {/* Section list + add */}
      <div className="space-y-4 md:order-1">
        <div className="flex flex-wrap items-center gap-2">
          {SECTION_TYPES.map((t) => (
            <button key={t} type="button" onClick={() => addSection(t)} data-testid={`add-${t}`}
                    className="rounded-pill border border-onyx-600 px-3 py-1 text-xs uppercase tracking-widest hover:border-gold/40 hover:text-gold">
              + {t}
            </button>
          ))}
        </div>

        <p className="text-xs text-ivory-mute">
          Drag sections by the handle to reorder them. Arrow buttons remain available for keyboard-first editing.
        </p>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
            <ul className="space-y-2" data-testid="section-list">
              {sections.map((section, index) => (
                <SortableSectionRow
                  key={section.id}
                  section={section}
                  index={index}
                  onMove={move}
                  onRemove={remove}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>

        <div className="flex gap-2">
          <button onClick={onSave} disabled={pending} className="btn-ghost" data-testid="save-draft">Save draft</button>
          <button onClick={onPublish} disabled={pending} className="btn-gold" data-testid="publish">Publish</button>
          {savedAt && <span className="self-center text-xs text-ivory-mute">{savedAt}</span>}
        </div>
      </div>
    </div>
  );
}
