"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { ArrowDown, ArrowUp, Copy, Eye, EyeOff, Monitor, Pencil, Plus, Smartphone, Trash2, X } from "lucide-react";
import type { Section, SectionType } from "@/lib/sections/types";

type SectionMeta = { label: string; hint: string; group: "Essentials" | "Media" | "Text & layout" | "Grow" };

export const SECTION_META: Record<SectionType, SectionMeta> = {
  header: { label: "Profile header", hint: "Photo, name and tagline", group: "Essentials" },
  link: { label: "Link button", hint: "Send people to any URL", group: "Essentials" },
  social: { label: "Social icons", hint: "Instagram, TikTok, X and more", group: "Essentials" },
  phone: { label: "Call button", hint: "Tap to call you", group: "Essentials" },
  email: { label: "Email button", hint: "Tap to email you", group: "Essentials" },
  image: { label: "Image", hint: "A single photo or graphic", group: "Media" },
  gallery: { label: "Photo gallery", hint: "Grid, masonry or carousel", group: "Media" },
  video: { label: "Video", hint: "Play an uploaded video", group: "Media" },
  youtube: { label: "YouTube", hint: "Embed a YouTube video", group: "Media" },
  spotify: { label: "Spotify", hint: "A track, album or playlist", group: "Media" },
  markdown: { label: "Text", hint: "Headings, paragraphs, lists", group: "Text & layout" },
  feature: { label: "Feature card", hint: "Icon, title, description and a link", group: "Text & layout" },
  stats: { label: "Stats", hint: "Big numbers that build trust", group: "Grow" },
  testimonial: { label: "Testimonial", hint: "A quote from a happy client", group: "Grow" },
  divider: { label: "Divider", hint: "A thin line between sections", group: "Text & layout" },
  spacer: { label: "Spacer", hint: "Empty breathing room", group: "Text & layout" },
  form: { label: "Contact form", hint: "Collect leads and messages", group: "Grow" },
  schedule: { label: "Scheduling link", hint: "Cal.com or Calendly", group: "Grow" },
  booking: { label: "Booking", hint: "Let people book you", group: "Grow" },
  store: { label: "Store", hint: "Sell your products", group: "Grow" },
  tip: { label: "Tip jar", hint: "Accept tips", group: "Grow" },
  qr: { label: "QR code", hint: "Scan to open a link", group: "Grow" },
  map: { label: "Map", hint: "Show a location", group: "Grow" },
  embed: { label: "Embed code", hint: "Paste HTML from another site", group: "Grow" },
};

const GROUPS: SectionMeta["group"][] = ["Essentials", "Media", "Text & layout", "Grow"];

export function sectionTitle(section: Section): string {
  switch (section.type) {
    case "header": return section.props.name || SECTION_META.header.label;
    case "link": return section.props.label || SECTION_META.link.label;
    case "phone": return section.props.label || SECTION_META.phone.label;
    case "email": return section.props.label || SECTION_META.email.label;
    case "store": return section.props.title || SECTION_META.store.label;
    case "form": return section.props.title || SECTION_META.form.label;
    default: return SECTION_META[section.type].label;
  }
}

/**
 * Mobile-first "what you see is what you edit" canvas: the real page is the
 * editor. Tap any part to edit it in a bottom sheet; tap + to insert.
 */
export function MobileCanvasEditor({
  sections,
  validationById,
  renderPreview,
  renderFields,
  onChange,
  onMove,
  onRemove,
  onDuplicate,
  onAdd,
  onOpenTemplates,
  insertAt,
  onInsertAtChange,
}: {
  sections: Section[];
  validationById: Map<string, string>;
  renderPreview: (section: Section, index: number) => ReactNode;
  renderFields: (section: Section, onChange: (next: Section) => void) => ReactNode;
  onChange: (index: number, next: Section) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove: (index: number) => void;
  onDuplicate: (index: number) => string | void;
  onAdd: (type: SectionType, insertAt: number) => string;
  onOpenTemplates: () => void;
  /** Where the add sheet will insert; null = closed. Owned by the editor so its toolbar can open the sheet. */
  insertAt: number | null;
  onInsertAtChange: (at: number | null) => void;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const setInsertAt = onInsertAtChange;

  const editingIndex = editingId ? sections.findIndex((section) => section.id === editingId) : -1;
  const editing = editingIndex >= 0 ? sections[editingIndex]! : null;

  function add(type: SectionType) {
    const at = insertAt ?? sections.length;
    const id = onAdd(type, at);
    setInsertAt(null);
    setEditingId(id);
  }

  return (
    <div className="space-y-3" data-testid="mobile-canvas">
      <p className="px-1 text-xs text-ivory-mute">
        This is your page. <span className="text-ivory">Tap anything to edit it</span>, or tap <Plus className="inline size-3 text-gold" aria-hidden /> to add something.
      </p>

      <div
        className="vc-profile vc-profile-preview overflow-hidden rounded-[28px] border border-onyx-700 px-4 pb-6 pt-6 shadow-[0_30px_80px_-40px_rgba(0,0,0,0.8)]"
        style={{ background: "var(--vc-bg, #0a0a0a)", color: "var(--vc-fg, #f7f3ea)", maxWidth: "none" }}
      >
        {sections.length === 0 ? (
          <div className="space-y-3 py-10 text-center">
            <p className="font-display text-xl">Start your page</p>
            <p className="text-sm opacity-70">Pick a ready-made template or add your first section.</p>
            <div className="flex justify-center gap-2 pt-2">
              <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={onOpenTemplates}>Use a template</button>
              <button type="button" className="btn-gold px-4 py-2 text-sm" onClick={() => setInsertAt(0)}>Add section</button>
            </div>
          </div>
        ) : null}

        {sections.map((section, index) => {
          const hidden = section.visible === false;
          const desktopOnly = section.layout?.hideOnMobile === true;
          const invalid = validationById.get(section.id);
          return (
            <div key={section.id}>
              {index > 0 ? <InsertButton onClick={() => setInsertAt(index)} /> : null}
              <div
                role="button"
                tabIndex={0}
                onClick={() => setEditingId(section.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setEditingId(section.id);
                  }
                }}
                className={[
                  "group relative -mx-2 cursor-pointer rounded-2xl px-2 py-1 outline-none transition",
                  "ring-1 ring-transparent hover:ring-white/20 focus-visible:ring-2 focus-visible:ring-[var(--vc-accent,#d4a853)]",
                  editingId === section.id ? "ring-2 ring-[var(--vc-accent,#d4a853)]" : "",
                  invalid ? "ring-2 ring-red-400/70" : "",
                ].join(" ")}
                aria-label={`Edit ${sectionTitle(section)}`}
                data-testid={`canvas-section-${section.id}`}
              >
                <div className={["pointer-events-none select-none [&_*]:pointer-events-none", hidden || desktopOnly ? "opacity-35" : ""].join(" ")}>
                  {renderPreview(section, index)}
                </div>
                <span className="pointer-events-none absolute right-3 top-2 z-10 inline-flex items-center gap-1 rounded-full bg-black/70 px-2 py-1 text-[10px] font-medium uppercase tracking-widest text-white backdrop-blur">
                  {hidden ? <><EyeOff className="size-3" aria-hidden /> Hidden</> : desktopOnly ? <><Monitor className="size-3" aria-hidden /> Desktop only</> : invalid ? "Needs a fix" : <><Pencil className="size-3" aria-hidden /> {SECTION_META[section.type].label}</>}
                </span>
              </div>
            </div>
          );
        })}

        {sections.length > 0 ? (
          <button
            type="button"
            onClick={() => setInsertAt(sections.length)}
            className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[color-mix(in_srgb,var(--vc-accent,#d4a853)_45%,transparent)] py-4 text-sm font-medium text-[var(--vc-accent,#d4a853)]"
            data-testid="canvas-add-end"
          >
            <Plus className="size-4" aria-hidden /> Add a section
          </button>
        ) : null}
      </div>

      <BottomSheet
        open={!!editing}
        onClose={() => setEditingId(null)}
        title={editing ? sectionTitle(editing) : ""}
        eyebrow={editing ? SECTION_META[editing.type].label : ""}
        testId="section-sheet"
        footer={editing ? (
          <div className="grid grid-cols-5 gap-1">
            <SheetAction label="Up" icon={<ArrowUp className="size-4" />} disabled={editingIndex <= 0} onClick={() => onMove(editingIndex, -1)} />
            <SheetAction label="Down" icon={<ArrowDown className="size-4" />} disabled={editingIndex >= sections.length - 1} onClick={() => onMove(editingIndex, 1)} />
            <SheetAction
              label={editing.visible === false ? "Show" : "Hide"}
              icon={editing.visible === false ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              onClick={() => onChange(editingIndex, { ...editing, visible: editing.visible === false })}
            />
            <SheetAction
              label="Duplicate"
              icon={<Copy className="size-4" />}
              onClick={() => {
                const id = onDuplicate(editingIndex);
                if (id) setEditingId(id);
              }}
            />
            <SheetAction
              label="Delete"
              danger
              icon={<Trash2 className="size-4" />}
              onClick={() => {
                if (window.confirm(`Delete “${sectionTitle(editing)}”? You can undo this.`)) {
                  onRemove(editingIndex);
                  setEditingId(null);
                }
              }}
            />
          </div>
        ) : null}
      >
        {editing ? (
          <div className="space-y-4">
            {validationById.get(editing.id) ? (
              <p className="rounded-card border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
                {validationById.get(editing.id)}
              </p>
            ) : null}
            {renderFields(editing, (next) => onChange(editingIndex, next))}
            <div className="rounded-card border border-onyx-800 p-3">
              <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-ivory-mute">Show on</p>
              <div className="grid grid-cols-2 gap-2">
                <DeviceToggle
                  label="Phone"
                  icon={<Smartphone className="size-4" />}
                  active={!editing.layout?.hideOnMobile}
                  onClick={() => onChange(editingIndex, withLayout(editing, { hideOnMobile: !editing.layout?.hideOnMobile }))}
                />
                <DeviceToggle
                  label="Tablet & desktop"
                  icon={<Monitor className="size-4" />}
                  active={!editing.layout?.hideOnDesktop}
                  onClick={() => onChange(editingIndex, withLayout(editing, { hideOnDesktop: !editing.layout?.hideOnDesktop }))}
                />
              </div>
            </div>
          </div>
        ) : null}
      </BottomSheet>

      <BottomSheet
        open={insertAt !== null}
        onClose={() => setInsertAt(null)}
        title="Add a section"
        doneLabel="Cancel"
        eyebrow={insertAt !== null && insertAt < sections.length ? `Inserting at position ${insertAt + 1}` : "Adds to the end"}
        testId="add-sheet"
      >
        <div className="space-y-5">
          {GROUPS.map((group) => (
            <div key={group}>
              <p className="mb-2 text-[11px] uppercase tracking-[0.2em] text-ivory-mute">{group}</p>
              <div className="grid grid-cols-2 gap-2">
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

function withLayout(section: Section, patch: { hideOnMobile?: boolean; hideOnDesktop?: boolean }): Section {
  const layout = { ...section.layout, ...patch };
  if (!layout.hideOnMobile) delete layout.hideOnMobile;
  if (!layout.hideOnDesktop) delete layout.hideOnDesktop;
  return { ...section, layout } as Section;
}

function InsertButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="relative flex h-5 items-center justify-center">
      <span className="absolute inset-x-6 top-1/2 h-px bg-[color-mix(in_srgb,var(--vc-accent,#d4a853)_18%,transparent)]" aria-hidden />
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

function SheetAction({ label, icon, onClick, disabled, danger }: { label: string; icon: ReactNode; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "flex flex-col items-center gap-1 rounded-card py-2 text-[11px] transition disabled:opacity-30",
        danger ? "text-red-300 hover:bg-red-500/10" : "text-ivory-dim hover:bg-onyx-900 hover:text-ivory",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

function DeviceToggle({ label, icon, active, onClick }: { label: string; icon: ReactNode; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={[
        "flex items-center justify-center gap-2 rounded-card border px-3 py-2.5 text-sm transition",
        active ? "border-gold/60 bg-gold/10 text-gold" : "border-onyx-700 text-ivory-mute line-through",
      ].join(" ")}
    >
      {icon}
      {label}
    </button>
  );
}

export function BottomSheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  testId,
  doneLabel = "Done",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
  doneLabel?: string;
}) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const dragControls = useDragControls();
  useEffect(() => {
    // Portal target resolves after mount so SSR markup stays stable.
    const frame = requestAnimationFrame(() => setPortalTarget(document.body));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!portalTarget) return null;

  return <>{createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[110]" data-testid={testId}>
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[26px] border-t border-onyx-700 bg-onyx-950 text-ivory shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.8)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            {/* Only the grabber + title bar start a swipe-to-close, so scrolling and inputs inside never fight it. */}
            <div className="shrink-0 touch-none" onPointerDown={(event) => dragControls.start(event)}>
            <div className="flex cursor-grab justify-center pt-2.5" aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-onyx-600" />
            </div>
            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-2">
              <div className="min-w-0">
                {eyebrow ? <p className="text-[10px] uppercase tracking-[0.25em] text-gold/80">{eyebrow}</p> : null}
                <p className="truncate font-display text-xl">{title}</p>
              </div>
              <button type="button" onClick={onClose} className="btn-gold shrink-0 px-4 py-2 text-sm" data-testid="sheet-done">
                {doneLabel}
              </button>
            </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
              {children}
            </div>
            {footer ? (
              <div className="shrink-0 border-t border-onyx-800 px-3 pt-2" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
                {footer}
              </div>
            ) : (
              <div style={{ height: "env(safe-area-inset-bottom)" }} />
            )}
            <button type="button" onClick={onClose} className="sr-only">
              <X aria-hidden /> Close
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    portalTarget,
  )}</>;
}
