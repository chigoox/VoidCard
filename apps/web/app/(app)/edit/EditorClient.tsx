"use client";

import "client-only";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
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
import { deleteVariantB, deleteVersion, getStorageUsage, getVariantB, listOwnedSellerProducts, listVersions, publishDraft, restoreVersion, saveDraft, saveVariantB, setCustomCss, setScheduledPublish, setTheme, snapshotVersion } from "./actions";
import {
  Section as SectionSchema,
  SECTION_ANIMATIONS,
  SECTION_TYPES,
  GALLERY_LAYOUTS,
  type Section as SectionRecord,
  type Sections,
} from "@/lib/sections/types";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { BrandedQR } from "@/components/BrandedQR";
import { THEME_PRESETS, getThemePreset, themeToCss } from "@/lib/themes/presets";
import { SECTION_TEMPLATES } from "@/lib/editor/templates";
import { readStyleStudio, writeStyleStudio, type StyleStudio } from "@/lib/editor/styleStudio";

const StyleStudioPanel = dynamic(() => import("./StyleStudioPanel"), {
  ssr: false,
  loading: () => <section className="card space-y-3 p-4 text-xs text-ivory-dim" data-testid="style-studio-loading">Loading style studio…</section>,
});

const MediaManagerModal = dynamic(() => import("./MediaManagerModal").then((m) => m.MediaManagerModal), {
  ssr: false,
});

const LINK_STYLES = ["pill", "card", "ghost"] as const;
const SOCIAL_PLATFORMS = [
  "instagram",
  "tiktok",
  "x",
  "linkedin",
  "youtube",
  "threads",
  "github",
  "facebook",
  "snapchat",
] as const;
const FORM_FIELD_TYPES = ["text", "email", "phone", "textarea"] as const;
const SCHEDULE_PROVIDERS = ["calcom", "calendly", "ed5"] as const;
const INPUT_CLASS_NAME =
  "w-full rounded-card border border-onyx-700 bg-onyx-950 px-3 py-2.5 text-sm text-ivory outline-none transition focus:border-gold/60";
const TEXTAREA_CLASS_NAME = `${INPUT_CLASS_NAME} min-h-[112px] resize-y`;

type MediaLibraryItem = {
  id: string;
  kind: "image" | "video";
  mime: string | null;
  url: string;
  createdAt: string;
};

function sanitizeCss(css: string) {
  return css.replace(/@import[^;]+;/gi, "").replace(/javascript:/gi, "").replace(/expression\s*\(/gi, "");
}

function uploadErrorMessage(code: unknown) {
  switch (code) {
    case "mime_not_allowed":
      return "That file type is not allowed.";
    case "storage_quota_exceeded":
      return "Storage quota exceeded for this account.";
    case "too_large":
      return "That file is too large.";
    default:
      return "Upload failed. Try again.";
  }
}

async function uploadMediaAsset(file: File, kind: "image" | "video") {
  const signResponse = await fetch("/api/media/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mime: file.type || "application/octet-stream",
      sizeBytes: file.size,
      kind,
      visibility: "public",
    }),
  });
  const signBody = await signResponse.json().catch(() => ({}));
  if (!signResponse.ok || !signBody.ok) {
    throw new Error(uploadErrorMessage(signBody.error));
  }

  const uploadResponse = await fetch(signBody.signedUrl as string, {
    method: "PUT",
    headers: { "content-type": file.type || "application/octet-stream" },
    body: file,
  });
  if (!uploadResponse.ok) {
    throw new Error("Upload failed. Try again.");
  }

  const finalizeResponse = await fetch("/api/media/finalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      bucket: signBody.bucket,
      path: signBody.path,
      kind,
      mime: file.type || "application/octet-stream",
      sizeBytes: file.size,
    }),
  });
  const finalizeBody = await finalizeResponse.json().catch(() => ({}));
  if (!finalizeResponse.ok || !finalizeBody.ok || typeof finalizeBody.url !== "string") {
    throw new Error(uploadErrorMessage(finalizeBody.error));
  }

  return {
    id: String(finalizeBody.media.id),
    kind,
    mime: file.type || null,
    url: finalizeBody.url as string,
    createdAt: new Date().toISOString(),
  } satisfies MediaLibraryItem;
}

function MediaField({
  label,
  value,
  accept,
  kind,
  recentMedia,
  onChange,
  onMediaAdded,
}: {
  label: string;
  value: string;
  accept: string;
  kind: "image" | "video";
  recentMedia: MediaLibraryItem[];
  onChange: (value: string) => void;
  onMediaAdded: (asset: MediaLibraryItem) => void;
}) {
  const [message, setMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, startUpload] = useTransition();

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const file = input.files?.[0];
    input.value = "";
    if (!file) return;

    setMessage(null);
    startUpload(async () => {
      try {
        const asset = await uploadMediaAsset(file, kind);
        onMediaAdded(asset);
        onChange(asset.url);
        setMessage("Uploaded and selected.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Upload failed. Try again.");
      }
    });
  }

  function rotateCurrent() {
    if (kind !== "image" || !value) return;
    setMessage(null);
    startUpload(async () => {
      try {
        const img = new Image();
        img.crossOrigin = "anonymous";
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("Could not load image for rotation."));
          img.src = value;
        });
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalHeight;
        canvas.height = img.naturalWidth;
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Canvas not supported.");
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((b) => resolve(b), "image/png", 0.92));
        if (!blob) throw new Error("Rotation failed.");
        const file = new File([blob], `rotated-${Date.now()}.png`, { type: "image/png" });
        const asset = await uploadMediaAsset(file, "image");
        onMediaAdded(asset);
        onChange(asset.url);
        setMessage("Rotated and uploaded.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not rotate.");
      }
    });
  }

  return (
    <Field label={label} className="space-y-2">
      {value && kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="" className="h-20 w-20 rounded-card border border-onyx-800 object-cover" />
      ) : null}
      <input className={INPUT_CLASS_NAME} value={value} onChange={(event) => onChange(event.target.value)} placeholder="https://… or pick from library" />
      <div className="flex flex-wrap gap-2">
        <label className="btn-ghost cursor-pointer px-3 py-2 text-xs">
          {uploading ? "Uploading…" : "Upload"}
          <input type="file" accept={accept} className="hidden" onChange={handleFileChange} />
        </label>
        <button
          type="button"
          className="btn-ghost px-3 py-2 text-xs"
          onClick={() => setModalOpen(true)}
          data-testid={`browse-library-${kind}`}
        >
          Browse library
        </button>
        {kind === "image" ? (
          <button
            type="button"
            className="btn-ghost px-3 py-2 text-xs"
            onClick={() => setModalOpen(true)}
            data-testid="open-ai-gen"
          >
            ✨ Generate with AI
          </button>
        ) : null}
        {kind === "image" && value ? (
          <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={rotateCurrent} disabled={uploading} data-testid="rotate-image">
            Rotate 90°
          </button>
        ) : null}
        {value ? (
          <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={() => onChange("")}>
            Clear
          </button>
        ) : null}
      </div>
      {message ? <p className="text-xs text-ivory-mute">{message}</p> : null}
      <MediaManagerModal
        open={modalOpen}
        kind={kind}
        onClose={() => setModalOpen(false)}
        onSelect={(asset) => {
          onMediaAdded({
            id: asset.id,
            kind: asset.kind === "image" ? "image" : "video",
            mime: asset.mime,
            url: asset.url,
            createdAt: asset.createdAt,
          });
          onChange(asset.url);
          setModalOpen(false);
          setMessage("Selected from library.");
        }}
        onAssetAdded={(asset) =>
          onMediaAdded({
            id: asset.id,
            kind: asset.kind === "image" ? "image" : "video",
            mime: asset.mime,
            url: asset.url,
            createdAt: asset.createdAt,
          })
        }
      />
    </Field>
  );
}

function sectionMatchesFilter(section: SectionRecord, filter: string): boolean {
  const q = filter.trim().toLowerCase();
  if (!q) return true;
  if (section.type.toLowerCase().includes(q)) return true;
  const summary = sectionSummary(section).toLowerCase();
  if (summary.includes(q)) return true;
  return false;
}

function AutosaveStatus({
  isOnline,
  pending,
  isDirty,
  savedAt,
  hasErrors,
}: {
  isOnline: boolean;
  pending: boolean;
  isDirty: boolean;
  savedAt: string | null;
  hasErrors: boolean;
}) {
  let label = "All changes saved";
  let tone = "border-onyx-700 bg-onyx-950/60 text-ivory-mute";
  if (!isOnline) {
    label = "Offline — changes will save when reconnected";
    tone = "border-amber-500/40 bg-amber-500/10 text-amber-200";
  } else if (hasErrors) {
    label = "Autosave paused: fix validation errors";
    tone = "border-red-400/30 bg-red-500/10 text-red-200";
  } else if (pending) {
    label = "Saving…";
    tone = "border-gold/40 bg-gold/10 text-gold";
  } else if (isDirty) {
    label = "Unsaved changes";
    tone = "border-onyx-600 bg-onyx-950/60 text-ivory";
  } else if (savedAt) {
    label = savedAt;
  }
  return (
    <span className={`rounded-pill border px-3 py-1 text-xs ${tone}`} data-testid="autosave-status">
      {label}
    </span>
  );
}

// StyleStudioPanel is dynamically imported below to keep its module out of
// the initial editor chunk. The legacy in-file definition has moved to
// ./StyleStudioPanel.tsx.



function SortableSectionRow({
  index,
  section,
  validationMessage,
  recentMedia,
  collapsed,
  onToggleCollapsed,
  onChange,
  onMediaAdded,
  onMove,
  onRemove,
  onDuplicate,
  onCopyJson,
}: {
  index: number;
  section: SectionRecord;
  validationMessage: string | null;
  recentMedia: MediaLibraryItem[];
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onChange: (next: SectionRecord) => void;
  onMediaAdded: (asset: MediaLibraryItem) => void;
  onMove: (index: number, dir: -1 | 1) => void;
  onRemove: (index: number) => void;
  onDuplicate: () => void;
  onCopyJson: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: section.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const summary = sectionSummary(section);
  const animation = section.display?.animation ?? "none";
  const animationDelay = section.display?.animationDelay ?? 0;

  return (
    <motion.li
      ref={setNodeRef}
      style={style}
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={[
        "card min-w-0 space-y-4 p-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-gold/60 sm:p-4",
        isDragging ? "border-gold/60 shadow-[0_8px_24px_-12px_rgba(212,168,83,0.35)]" : "",
      ].join(" ")}
      data-testid={`section-row-${section.id}`}
      data-section-row={section.id}
      tabIndex={-1}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
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
            <button
              type="button"
              onClick={onToggleCollapsed}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand section" : "Collapse section"}
              className="btn-ghost px-2 py-1 text-xs"
              data-testid={`toggle-collapsed-${section.id}`}
            >
              {collapsed ? "▸" : "▾"}
            </button>
            <span className="uppercase tracking-widest text-ivory-mute">{section.type}</span>
            {validationMessage ? (
              <span
                className="rounded-pill border border-red-400/40 bg-red-500/10 px-2 py-0.5 text-[10px] uppercase tracking-widest text-red-200"
                title={validationMessage}
                data-testid={`validation-badge-${section.id}`}
              >
                Needs fix
              </span>
            ) : null}
            {!section.visible ? (
              <span className="rounded-pill border border-onyx-700 bg-onyx-950/60 px-2 py-0.5 text-[10px] uppercase tracking-widest text-ivory-mute">
                Hidden
              </span>
            ) : null}
            {summary ? (
              <span className="truncate text-xs text-ivory-mute" title={summary}>
                — {summary}
              </span>
            ) : null}
          </div>
          {!collapsed ? (
            <label className="flex items-center gap-2 text-xs uppercase tracking-widest text-ivory-mute">
              <input
                type="checkbox"
                checked={section.visible}
                onChange={(event) => onChange({ ...section, visible: event.target.checked })}
                className="size-4 rounded border-onyx-700 bg-onyx-950"
              />
              Visible
            </label>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-1 sm:gap-2">
          <button type="button" onClick={onDuplicate} className="btn-ghost px-2 py-1 text-xs" aria-label="Duplicate" data-testid={`duplicate-${section.id}`}>⧉</button>
          <button type="button" onClick={onCopyJson} className="btn-ghost px-2 py-1 text-xs" aria-label="Copy JSON" title="Copy section JSON" data-testid={`copy-json-${section.id}`}>⧉JSON</button>
          <button type="button" onClick={() => onMove(index, -1)} className="btn-ghost px-2 py-1 text-xs" aria-label="Move up">↑</button>
          <button type="button" onClick={() => onMove(index, 1)} className="btn-ghost px-2 py-1 text-xs" aria-label="Move down">↓</button>
          <button type="button" onClick={() => onRemove(index)} className="btn-ghost px-2 py-1 text-xs" aria-label="Remove">×</button>
        </div>
      </div>

      {validationMessage && !collapsed && (
        <p className="rounded-card border border-red-400/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          Fix this section before saving: {validationMessage}
        </p>
      )}

      {!collapsed ? (
        <>
          <SectionEditorFields section={section} recentMedia={recentMedia} onChange={onChange} onMediaAdded={onMediaAdded} />
          <details className="rounded-card border border-onyx-800 bg-onyx-950/40 px-3 py-2 text-xs">
            <summary className="cursor-pointer select-none text-ivory-mute">Animation & motion</summary>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <Field label="Animation">
                <select
                  className={INPUT_CLASS_NAME}
                  value={animation}
                  onChange={(event) =>
                    onChange({
                      ...section,
                      display: {
                        ...(section.display ?? {}),
                        animation: event.target.value as (typeof SECTION_ANIMATIONS)[number],
                      },
                    })
                  }
                  data-testid={`animation-${section.id}`}
                >
                  {SECTION_ANIMATIONS.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Delay (ms)">
                <input
                  className={INPUT_CLASS_NAME}
                  type="number"
                  min="0"
                  max="2000"
                  step="50"
                  value={String(animationDelay)}
                  onChange={(event) =>
                    onChange({
                      ...section,
                      display: {
                        ...(section.display ?? {}),
                        animationDelay: Math.max(0, Math.min(2000, normalizeInteger(event.target.value, animationDelay))),
                      },
                    })
                  }
                />
              </Field>
            </div>
          </details>
        </>
      ) : null}
    </motion.li>
  );
}

function sectionSummary(section: SectionRecord): string {
  switch (section.type) {
    case "header":
      return section.props.name || "";
    case "link":
      return section.props.label || section.props.url;
    case "image":
      return section.props.alt || "image";
    case "video":
      return section.props.src;
    case "spotify":
      return section.props.uri;
    case "youtube":
      return section.props.id;
    case "map":
      return section.props.label || `${section.props.lat}, ${section.props.lng}`;
    case "embed":
      return `embed (${section.props.height}px)`;
    case "form":
      return section.props.title;
    case "gallery":
      return `${section.props.images.length} image${section.props.images.length === 1 ? "" : "s"}`;
    case "markdown":
      return section.props.md.slice(0, 60);
    case "divider":
      return "";
    case "spacer":
      return `${section.props.height}px`;
    case "social":
      return `${section.props.items.length} item${section.props.items.length === 1 ? "" : "s"}`;
    case "qr":
      return section.props.label || section.props.url;
    case "tip":
      return `${section.props.amounts.length} amount${section.props.amounts.length === 1 ? "" : "s"}`;
    case "schedule":
      return section.props.url;
    case "store":
      return `${section.props.productIds.length} product${section.props.productIds.length === 1 ? "" : "s"}`;
  }
}

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={["block space-y-1", className ?? ""].join(" ").trim()}>
      <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">{label}</span>
      {children}
    </label>
  );
}

function PreviewSection({ section }: { section: SectionRecord }) {
  const parsed = SectionSchema.safeParse(section);
  if (!parsed.success) {
    return (
      <div className="card border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
        <p className="font-medium text-red-50">Preview unavailable until this section is valid.</p>
        <p className="mt-2 text-xs text-red-200">{parsed.error.issues[0]?.message ?? "Invalid section settings."}</p>
      </div>
    );
  }

  return <SectionRenderer section={parsed.data} />;
}

function SectionEditorFields({
  section,
  recentMedia,
  onChange,
  onMediaAdded,
}: {
  section: SectionRecord;
  recentMedia: MediaLibraryItem[];
  onChange: (next: SectionRecord) => void;
  onMediaAdded: (asset: MediaLibraryItem) => void;
}) {
  switch (section.type) {
    case "header": {
      const p = section.props;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Name">
            <input className={INPUT_CLASS_NAME} value={p.name} onChange={(event) => onChange({ ...section, props: { ...p, name: event.target.value } })} />
          </Field>
          <Field label="Handle">
            <input className={INPUT_CLASS_NAME} value={p.handle ?? ""} onChange={(event) => onChange({ ...section, props: { ...p, handle: event.target.value || undefined } })} />
          </Field>
          <Field label="Tagline" className="md:col-span-2">
            <textarea className={TEXTAREA_CLASS_NAME} value={p.tagline ?? ""} onChange={(event) => onChange({ ...section, props: { ...p, tagline: event.target.value || undefined } })} />
          </Field>
          <MediaField label="Avatar URL" value={p.avatarUrl ?? ""} accept="image/*" kind="image" recentMedia={recentMedia} onMediaAdded={onMediaAdded} onChange={(value) => onChange({ ...section, props: { ...p, avatarUrl: value || undefined } })} />
          <MediaField label="Cover URL" value={p.coverUrl ?? ""} accept="image/*" kind="image" recentMedia={recentMedia} onMediaAdded={onMediaAdded} onChange={(value) => onChange({ ...section, props: { ...p, coverUrl: value || undefined } })} />
          <label className="flex items-center gap-2 text-sm text-ivory md:col-span-2">
            <input type="checkbox" checked={p.showVerified} onChange={(event) => onChange({ ...section, props: { ...p, showVerified: event.target.checked } })} className="size-4 rounded border-onyx-700 bg-onyx-950" />
            Show verified badge
          </label>
          <label className="flex items-center gap-2 text-sm text-ivory md:col-span-2">
            <input
              type="checkbox"
              checked={p.coverFullBleed ?? false}
              onChange={(event) => onChange({ ...section, props: { ...p, coverFullBleed: event.target.checked } })}
              className="size-4 rounded border-onyx-700 bg-onyx-950"
              data-testid="cover-full-bleed"
            />
            Cover banner fills full width of the screen
          </label>
        </div>
      );
    }
    case "link": {
      const p = section.props;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Label">
            <input className={INPUT_CLASS_NAME} value={p.label} onChange={(event) => onChange({ ...section, props: { ...p, label: event.target.value } })} />
          </Field>
          <Field label="Style">
            <select className={INPUT_CLASS_NAME} value={p.style} onChange={(event) => onChange({ ...section, props: { ...p, style: event.target.value as (typeof LINK_STYLES)[number] } })}>
              {LINK_STYLES.map((style) => <option key={style} value={style}>{style}</option>)}
            </select>
          </Field>
          <Field label="URL" className="md:col-span-2">
            <input className={INPUT_CLASS_NAME} value={p.url} onChange={(event) => onChange({ ...section, props: { ...p, url: event.target.value } })} />
          </Field>
          <Field label="Icon" className="md:col-span-2">
            <input className={INPUT_CLASS_NAME} value={p.icon ?? ""} onChange={(event) => onChange({ ...section, props: { ...p, icon: event.target.value || undefined } })} />
          </Field>
        </div>
      );
    }
    case "image": {
      const p = section.props;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="md:col-span-2">
            <MediaField label="Image URL" value={p.src} accept="image/*" kind="image" recentMedia={recentMedia} onMediaAdded={onMediaAdded} onChange={(value) => onChange({ ...section, props: { ...p, src: value } })} />
          </div>
          <Field label="Alt text (recommended for accessibility & SEO)" className="md:col-span-2">
            <input className={INPUT_CLASS_NAME} value={p.alt} placeholder="Describe what's in the image" onChange={(event) => onChange({ ...section, props: { ...p, alt: event.target.value } })} />
          </Field>
          <label className="flex items-center gap-2 text-sm text-ivory md:col-span-2">
            <input type="checkbox" checked={p.rounded} onChange={(event) => onChange({ ...section, props: { ...p, rounded: event.target.checked } })} className="size-4 rounded border-onyx-700 bg-onyx-950" />
            Rounded corners
          </label>
        </div>
      );
    }
    case "video": {
      const p = section.props;
      return (
        <div className="grid gap-3">
          <MediaField label="Video URL" value={p.src} accept="video/mp4,video/webm" kind="video" recentMedia={recentMedia} onMediaAdded={onMediaAdded} onChange={(value) => onChange({ ...section, props: { ...p, src: value } })} />
          <MediaField label="Poster URL" value={p.poster ?? ""} accept="image/*" kind="image" recentMedia={recentMedia} onMediaAdded={onMediaAdded} onChange={(value) => onChange({ ...section, props: { ...p, poster: value || undefined } })} />
        </div>
      );
    }
    case "spotify": {
      const p = section.props;
      return (
        <Field label="Spotify URI">
          <input className={INPUT_CLASS_NAME} value={p.uri} onChange={(event) => onChange({ ...section, props: { ...p, uri: event.target.value } })} />
        </Field>
      );
    }
    case "youtube": {
      const p = section.props;
      return (
        <Field label="YouTube URL or video ID">
          <input className={INPUT_CLASS_NAME} value={p.id} onChange={(event) => onChange({ ...section, props: { ...p, id: normalizeYoutubeId(event.target.value) } })} />
        </Field>
      );
    }
    case "map": {
      const p = section.props;
      return (
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Latitude">
            <input className={INPUT_CLASS_NAME} type="number" step="any" value={String(p.lat)} onChange={(event) => onChange({ ...section, props: { ...p, lat: normalizeNumber(event.target.value, p.lat) } })} />
          </Field>
          <Field label="Longitude">
            <input className={INPUT_CLASS_NAME} type="number" step="any" value={String(p.lng)} onChange={(event) => onChange({ ...section, props: { ...p, lng: normalizeNumber(event.target.value, p.lng) } })} />
          </Field>
          <Field label="Label" className="md:col-span-2">
            <input className={INPUT_CLASS_NAME} value={p.label ?? ""} onChange={(event) => onChange({ ...section, props: { ...p, label: event.target.value || undefined } })} />
          </Field>
        </div>
      );
    }
    case "embed": {
      const p = section.props;
      const allowDomains = p.allowDomains ?? [];
      const autoHeight = p.autoHeight ?? false;
      return (
        <div className="grid gap-3">
          <Field label="Embed HTML">
            <textarea className={TEXTAREA_CLASS_NAME} value={p.html} onChange={(event) => onChange({ ...section, props: { ...p, html: event.target.value } })} />
          </Field>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Height (px)">
              <input className={INPUT_CLASS_NAME} type="number" min="1" max="1200" value={String(p.height)} onChange={(event) => onChange({ ...section, props: { ...p, height: normalizeInteger(event.target.value, p.height) } })} />
            </Field>
            <label className="flex items-center gap-2 self-end text-sm text-ivory">
              <input
                type="checkbox"
                checked={autoHeight}
                onChange={(event) => onChange({ ...section, props: { ...p, autoHeight: event.target.checked } })}
                className="size-4 rounded border-onyx-700 bg-onyx-950"
              />
              Auto-resize from postMessage
            </label>
          </div>
          <Field label="Allowed origins (one per line)">
            <textarea
              className={TEXTAREA_CLASS_NAME}
              value={allowDomains.join("\n")}
              placeholder="https://yourapp.com"
              onChange={(event) => onChange({ ...section, props: { ...p, allowDomains: event.target.value.split(/\r?\n/).map((s) => s.trim()).filter(Boolean).slice(0, 20) } })}
            />
          </Field>
          <p className="text-xs text-ivory-mute">
            For auto-resize, your embed should call{" "}
            <code className="rounded bg-onyx-950 px-1 py-0.5">parent.postMessage({"{ type: 'vc:resize', height }"}, '*')</code>.
          </p>
        </div>
      );
    }
    case "form": {
      const p = section.props;
      return (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Title">
              <input className={INPUT_CLASS_NAME} value={p.title} onChange={(event) => onChange({ ...section, props: { ...p, title: event.target.value } })} />
            </Field>
            <Field label="Success message">
              <input className={INPUT_CLASS_NAME} value={p.successMessage} onChange={(event) => onChange({ ...section, props: { ...p, successMessage: event.target.value } })} />
            </Field>
          </div>
          <p className="text-xs text-ivory-mute">
            Shown after a successful lead capture on the public profile. Submissions appear in your{" "}
            <Link href="/contacts" className="text-gold underline-offset-2 hover:underline">
              Contacts inbox
            </Link>
            .
          </p>
          <label className="flex items-center gap-2 text-sm text-ivory">
            <input type="checkbox" checked={p.proLeadMode} onChange={(event) => onChange({ ...section, props: { ...p, proLeadMode: event.target.checked } })} className="size-4 rounded border-onyx-700 bg-onyx-950" />
            Enable Pro lead mode
          </label>
          <div className="grid gap-3 rounded-card border border-onyx-800 bg-onyx-950/40 p-3 md:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-ivory">
              <input
                type="checkbox"
                checked={p.requireConsent ?? false}
                onChange={(event) => onChange({ ...section, props: { ...p, requireConsent: event.target.checked } })}
                className="size-4 rounded border-onyx-700 bg-onyx-950"
              />
              Require GDPR consent
            </label>
            <label className="flex items-center gap-2 text-sm text-ivory">
              <input
                type="checkbox"
                checked={p.requireCaptcha ?? false}
                onChange={(event) => onChange({ ...section, props: { ...p, requireCaptcha: event.target.checked } })}
                className="size-4 rounded border-onyx-700 bg-onyx-950"
              />
              Require CAPTCHA confirmation
            </label>
            <Field label="Consent text" className="md:col-span-2">
              <input
                className={INPUT_CLASS_NAME}
                value={p.consentText ?? ""}
                placeholder="I agree to be contacted about my inquiry."
                onChange={(event) => onChange({ ...section, props: { ...p, consentText: event.target.value || undefined } })}
              />
            </Field>
          </div>
          <div className="space-y-3">
            {p.fields.map((field, fieldIndex) => (
              <div key={`${section.id}-field-${fieldIndex}`} className="grid gap-3 rounded-card border border-onyx-800 bg-onyx-950/60 p-3 md:grid-cols-2 xl:grid-cols-5">
                <Field label="Name">
                  <input className={INPUT_CLASS_NAME} value={field.name} onChange={(event) => onChange({ ...section, props: { ...p, fields: p.fields.map((entry, index) => index === fieldIndex ? { ...entry, name: event.target.value } : entry) } })} />
                </Field>
                <Field label="Label">
                  <input className={INPUT_CLASS_NAME} value={field.label} onChange={(event) => onChange({ ...section, props: { ...p, fields: p.fields.map((entry, index) => index === fieldIndex ? { ...entry, label: event.target.value } : entry) } })} />
                </Field>
                <Field label="Type">
                  <select className={INPUT_CLASS_NAME} value={field.type} onChange={(event) => onChange({ ...section, props: { ...p, fields: p.fields.map((entry, index) => index === fieldIndex ? { ...entry, type: event.target.value as (typeof FORM_FIELD_TYPES)[number] } : entry) } })}>
                    {FORM_FIELD_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
                  </select>
                </Field>
                <label className="flex items-center gap-2 text-sm text-ivory xl:self-end xl:pb-2">
                  <input type="checkbox" checked={field.required} onChange={(event) => onChange({ ...section, props: { ...p, fields: p.fields.map((entry, index) => index === fieldIndex ? { ...entry, required: event.target.checked } : entry) } })} className="size-4 rounded border-onyx-700 bg-onyx-950" />
                  Required
                </label>
                <button type="button" className="btn-ghost xl:self-end" onClick={() => onChange({ ...section, props: { ...p, fields: p.fields.filter((_, index) => index !== fieldIndex) } })}>
                  Remove field
                </button>
              </div>
            ))}
            <button type="button" className="btn-ghost" onClick={() => onChange({ ...section, props: { ...p, fields: [...p.fields, { name: `field_${p.fields.length + 1}`, label: "New field", type: "text", required: false }] } })}>
              Add field
            </button>
          </div>
        </div>
      );
    }
    case "gallery": {
      const gallerySection = section;
      const p = gallerySection.props;
      const layout = p.layout ?? "grid";
      const lightbox = p.lightbox ?? true;
      function moveImage(from: number, dir: -1 | 1) {
        const to = from + dir;
        if (to < 0 || to >= p.images.length) return;
        const next = [...p.images];
        [next[from], next[to]] = [next[to]!, next[from]!];
        onChange({ ...gallerySection, props: { ...p, images: next } });
      }
      return (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Layout">
              <select
                className={INPUT_CLASS_NAME}
                value={layout}
                onChange={(event) => onChange({ ...section, props: { ...p, layout: event.target.value as (typeof GALLERY_LAYOUTS)[number] } })}
                data-testid={`gallery-layout-${section.id}`}
              >
                {GALLERY_LAYOUTS.map((value) => (
                  <option key={value} value={value}>{value}</option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-2 self-end text-sm text-ivory">
              <input
                type="checkbox"
                checked={lightbox}
                onChange={(event) => onChange({ ...section, props: { ...p, lightbox: event.target.checked } })}
                className="size-4 rounded border-onyx-700 bg-onyx-950"
              />
              Open full-size on click (lightbox)
            </label>
          </div>
          {p.images.map((image, imageIndex) => (
            <div key={`${section.id}-image-${imageIndex}`} className="grid gap-3 rounded-card border border-onyx-800 bg-onyx-950/60 p-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
              <MediaField label="Image URL" value={image.src} accept="image/*" kind="image" recentMedia={recentMedia} onMediaAdded={onMediaAdded} onChange={(value) => onChange({ ...section, props: { ...p, images: p.images.map((entry, index) => index === imageIndex ? { ...entry, src: value } : entry) } })} />
              <Field label="Alt text (recommended)">
                <input className={INPUT_CLASS_NAME} value={image.alt} placeholder="Describe the image" onChange={(event) => onChange({ ...section, props: { ...p, images: p.images.map((entry, index) => index === imageIndex ? { ...entry, alt: event.target.value } : entry) } })} />
              </Field>
              <div className="flex flex-wrap gap-1 self-end">
                <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => moveImage(imageIndex, -1)} aria-label="Move image up">↑</button>
                <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => moveImage(imageIndex, 1)} aria-label="Move image down">↓</button>
                <button type="button" className="btn-ghost px-2 py-1 text-xs" onClick={() => onChange({ ...section, props: { ...p, images: p.images.filter((_, index) => index !== imageIndex) } })}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="btn-ghost" onClick={() => onChange({ ...section, props: { ...p, images: [...p.images, { src: "https://placehold.co/600", alt: "" }] } })}>
            Add image
          </button>
        </div>
      );
    }
    case "markdown": {
      const p = section.props;
      return (
        <Field label="Markdown">
          <textarea className={TEXTAREA_CLASS_NAME} value={p.md} onChange={(event) => onChange({ ...section, props: { ...p, md: event.target.value } })} />
        </Field>
      );
    }
    case "divider": {
      return <p className="text-sm text-ivory-mute">Divider sections have no editable fields.</p>;
    }
    case "spacer": {
      const p = section.props;
      return (
        <Field label="Height (px)">
          <input className={INPUT_CLASS_NAME} type="number" min="1" max="200" value={String(p.height)} onChange={(event) => onChange({ ...section, props: { ...p, height: normalizeInteger(event.target.value, p.height) } })} />
        </Field>
      );
    }
    case "social": {
      const p = section.props;
      return (
        <div className="space-y-3">
          {p.items.map((item, itemIndex) => (
            <div key={`${section.id}-social-${itemIndex}`} className="grid gap-3 rounded-card border border-onyx-800 bg-onyx-950/60 p-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
              <Field label="Platform">
                <select className={INPUT_CLASS_NAME} value={item.platform} onChange={(event) => onChange({ ...section, props: { ...p, items: p.items.map((entry, index) => index === itemIndex ? { ...entry, platform: event.target.value as (typeof SOCIAL_PLATFORMS)[number] } : entry) } })}>
                  {SOCIAL_PLATFORMS.map((platform) => <option key={platform} value={platform}>{platform}</option>)}
                </select>
              </Field>
              <Field label="Handle">
                <input className={INPUT_CLASS_NAME} value={item.handle} onChange={(event) => onChange({ ...section, props: { ...p, items: p.items.map((entry, index) => index === itemIndex ? { ...entry, handle: event.target.value } : entry) } })} />
              </Field>
              <button type="button" className="btn-ghost self-end" onClick={() => onChange({ ...section, props: { ...p, items: p.items.filter((_, index) => index !== itemIndex) } })}>
                Remove social
              </button>
            </div>
          ))}
          <button type="button" className="btn-ghost" onClick={() => onChange({ ...section, props: { ...p, items: [...p.items, { platform: "instagram", handle: "" }] } })}>
            Add social
          </button>
        </div>
      );
    }
    case "qr": {
      const p = section.props;
      return (
        <div className="grid gap-3">
          <Field label="Target URL">
            <input className={INPUT_CLASS_NAME} value={p.url} onChange={(event) => onChange({ ...section, props: { ...p, url: event.target.value } })} />
          </Field>
          <Field label="Label">
            <input className={INPUT_CLASS_NAME} value={p.label ?? ""} onChange={(event) => onChange({ ...section, props: { ...p, label: event.target.value || undefined } })} />
          </Field>
        </div>
      );
    }
    case "tip": {
      const p = section.props;
      return (
        <div className="space-y-3">
          <Field label="Stripe account ID">
            <input className={INPUT_CLASS_NAME} value={p.stripeAccountId} onChange={(event) => onChange({ ...section, props: { ...p, stripeAccountId: event.target.value } })} />
          </Field>
          <div className="space-y-3">
            {p.amounts.map((amount, amountIndex) => (
              <div key={`${section.id}-amount-${amountIndex}`} className="grid gap-3 rounded-card border border-onyx-800 bg-onyx-950/60 p-3 md:grid-cols-[minmax(0,1fr)_auto]">
                <Field label="Amount (USD)">
                  <input className={INPUT_CLASS_NAME} type="number" min="1" step="1" value={String(amount / 100)} onChange={(event) => onChange({ ...section, props: { ...p, amounts: p.amounts.map((entry, index) => index === amountIndex ? normalizeCurrencyToCents(event.target.value, entry) : entry) } })} />
                </Field>
                <button type="button" className="btn-ghost self-end" onClick={() => onChange({ ...section, props: { ...p, amounts: p.amounts.filter((_, index) => index !== amountIndex) } })}>
                  Remove amount
                </button>
              </div>
            ))}
            <button type="button" className="btn-ghost" onClick={() => onChange({ ...section, props: { ...p, amounts: [...p.amounts, 500] } })}>
              Add amount
            </button>
          </div>
        </div>
      );
    }
    case "schedule": {
      const p = section.props;
      return (
        <div className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Provider">
              <select className={INPUT_CLASS_NAME} value={p.provider} onChange={(event) => onChange({ ...section, props: { ...p, provider: event.target.value as (typeof SCHEDULE_PROVIDERS)[number] } })}>
                {SCHEDULE_PROVIDERS.map((provider) => <option key={provider} value={provider}>{provider}</option>)}
              </select>
            </Field>
            <Field label="Booking URL">
              <input className={INPUT_CLASS_NAME} value={p.url} onChange={(event) => onChange({ ...section, props: { ...p, url: event.target.value } })} />
            </Field>
          </div>
          {(() => {
            const warn = scheduleUrlWarning(p.provider, p.url);
            if (!warn) return null;
            return (
              <p className="rounded-card border border-amber-400/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200" data-testid={`schedule-warning-${section.id}`}>
                {warn}
              </p>
            );
          })()}
          <p className="rounded-card border border-onyx-800 bg-onyx-950/40 px-3 py-2 text-xs text-ivory-mute">
            Bookings happen on {p.provider}. To capture lead details on VoidCard, pair this with a Form section above —
            submissions land in your{" "}
            <Link href="/contacts" className="text-gold underline-offset-2 hover:underline">
              Contacts inbox
            </Link>
            . You can also set a {p.provider} webhook to your{" "}
            <Link href="/account/api" className="text-gold underline-offset-2 hover:underline">
              VoidCard webhook URL
            </Link>{" "}
            for automatic capture.
          </p>
        </div>
      );
    }
    case "store": {
      return <StoreSectionEditorRow section={section} onChange={onChange} />;
    }
  }
}

function getSectionValidationMessage(section: SectionRecord) {
  const parsed = SectionSchema.safeParse(section);
  return parsed.success ? null : parsed.error.issues[0]?.message ?? "Invalid section settings.";
}

function normalizeYoutubeId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (url.hostname.includes("youtu.be")) {
      return url.pathname.replace(/^\//, "") || trimmed;
    }
    if (url.searchParams.get("v")) {
      return url.searchParams.get("v") ?? trimmed;
    }
    const embedMatch = url.pathname.match(/\/embed\/([^/]+)/);
    if (embedMatch?.[1]) {
      return embedMatch[1];
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

function normalizeNumber(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeInteger(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeCurrencyToCents(value: string, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.round(parsed * 100) : fallback;
}

function scheduleUrlWarning(provider: "calcom" | "calendly" | "ed5", url: string): string | null {
  if (!url.trim()) return "Add a booking URL.";
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Booking URL must be a valid URL.";
  }
  if (parsed.protocol !== "https:") return "Use https:// for booking URLs.";
  const host = parsed.hostname.toLowerCase();
  if (provider === "calcom" && !host.endsWith("cal.com")) {
    return "Cal.com URL should be on cal.com.";
  }
  if (provider === "calendly" && !host.endsWith("calendly.com")) {
    return "Calendly URL should be on calendly.com.";
  }
  return null;
}

function toLocalDatetime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

type OwnedSellerProduct = {
  id: string;
  name: string;
  priceCents: number;
  currency: string;
  active: boolean;
  imageUrl: string | null;
};

let ownedSellerProductsCache: OwnedSellerProduct[] | null = null;

function StoreSectionEditorRow({
  section,
  onChange,
}: {
  section: Extract<SectionRecord, { type: "store" }>;
  onChange: (next: SectionRecord) => void;
}) {
  const p = section.props;
  const [products, setProducts] = useState<OwnedSellerProduct[] | null>(ownedSellerProductsCache);
  const [loading, setLoading] = useState(ownedSellerProductsCache === null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (ownedSellerProductsCache !== null) return;
    let cancelled = false;
    setLoading(true);
    listOwnedSellerProducts()
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          ownedSellerProductsCache = res.products;
          setProducts(res.products);
        } else {
          setError("Could not load products.");
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load products.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function toggle(id: string) {
    const has = p.productIds.includes(id);
    const next = has
      ? p.productIds.filter((x) => x !== id)
      : [...p.productIds, id].slice(0, 24);
    onChange({ ...section, props: { ...p, productIds: next } });
  }

  function move(id: string, dir: -1 | 1) {
    const ids = [...p.productIds];
    const idx = ids.indexOf(id);
    if (idx < 0) return;
    const to = idx + dir;
    if (to < 0 || to >= ids.length) return;
    [ids[idx], ids[to]] = [ids[to]!, ids[idx]!];
    onChange({ ...section, props: { ...p, productIds: ids } });
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Title">
          <input
            className={INPUT_CLASS_NAME}
            value={p.title}
            onChange={(e) => onChange({ ...section, props: { ...p, title: e.target.value } })}
            data-testid={`store-title-${section.id}`}
          />
        </Field>
        <Field label="Button label">
          <input
            className={INPUT_CLASS_NAME}
            value={p.buttonLabel}
            onChange={(e) => onChange({ ...section, props: { ...p, buttonLabel: e.target.value } })}
          />
        </Field>
        <Field label="Layout">
          <select
            className={INPUT_CLASS_NAME}
            value={p.layout}
            onChange={(e) => onChange({ ...section, props: { ...p, layout: e.target.value as "grid" | "list" } })}
          >
            <option value="grid">grid</option>
            <option value="list">list</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 self-end text-sm text-ivory">
          <input
            type="checkbox"
            checked={p.showPrice}
            onChange={(e) => onChange({ ...section, props: { ...p, showPrice: e.target.checked } })}
            className="size-4 rounded border-onyx-700 bg-onyx-950"
          />
          Show prices
        </label>
      </div>

      <div className="space-y-2">
        <p className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">
          Selected products ({p.productIds.length}/24)
        </p>
        {loading ? (
          <p className="text-xs text-ivory-mute">Loading your products…</p>
        ) : error ? (
          <p className="text-xs text-red-300">{error}</p>
        ) : !products || products.length === 0 ? (
          <p className="rounded-card border border-onyx-800 bg-onyx-950/40 p-3 text-xs text-ivory-mute">
            You haven&apos;t created any products yet.{" "}
            <Link href="/account/products/new" className="text-gold underline-offset-2 hover:underline">
              Create your first product
            </Link>
            , then return here to add it to this store.
          </p>
        ) : (
          <ul className="space-y-2" data-testid={`store-products-${section.id}`}>
            {products.map((prod) => {
              const checked = p.productIds.includes(prod.id);
              const orderIdx = p.productIds.indexOf(prod.id);
              return (
                <li
                  key={prod.id}
                  className="flex items-center gap-2 rounded-card border border-onyx-800 bg-onyx-950/60 p-2"
                >
                  <label className="flex flex-1 items-center gap-3">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(prod.id)}
                      className="size-4 rounded border-onyx-700 bg-onyx-950"
                    />
                    {prod.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={prod.imageUrl} alt="" className="size-8 rounded-card object-cover" />
                    ) : (
                      <div className="size-8 rounded-card border border-onyx-700 bg-onyx-900" />
                    )}
                    <span className="flex-1 truncate text-sm text-ivory">
                      {prod.name}
                      {!prod.active ? <span className="ml-2 text-[10px] uppercase tracking-widest text-ivory-mute">inactive</span> : null}
                    </span>
                    <span className="font-mono text-xs text-gold">
                      ${(prod.priceCents / 100).toFixed(2)} {prod.currency.toUpperCase()}
                    </span>
                  </label>
                  {checked ? (
                    <span className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => move(prod.id, -1)}
                        className="btn-ghost px-2 py-1 text-xs"
                        disabled={orderIdx <= 0}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        onClick={() => move(prod.id, 1)}
                        className="btn-ghost px-2 py-1 text-xs"
                        disabled={orderIdx === p.productIds.length - 1}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                    </span>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-xs text-ivory-mute">
          Manage products in{" "}
          <Link href="/account/products" className="text-gold underline-offset-2 hover:underline">
            Account → Products
          </Link>
          . Connect Stripe in{" "}
          <Link href="/account/payments" className="text-gold underline-offset-2 hover:underline">
            Payments
          </Link>{" "}
          before going live.
        </p>
      </div>
    </div>
  );
}

export default function EditorClient({
  initial,
  username,
  profileId,
  initialThemeId,
  initialCustomCss,
  recentMedia,
  initialScheduledPublishAt,
  canSchedule,
  canAbVariants,
}: {
  initial: Sections;
  username: string;
  profileId: string;
  initialThemeId: string;
  initialCustomCss: string;
  recentMedia: MediaLibraryItem[];
  initialScheduledPublishAt?: string | null;
  canSchedule?: boolean;
  canAbVariants?: boolean;
}) {
  const [sections, setSections] = useState<Sections>(initial);
  const [themeId, setThemeId] = useState(initialThemeId);
  const [customCss, setCustomCssState] = useState(initialCustomCss);
  const [mediaLibrary, setMediaLibrary] = useState<MediaLibraryItem[]>(recentMedia);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>(() => {
    // Collapse all but the first section by default for a calmer UX.
    const map: Record<string, boolean> = {};
    initial.forEach((section, index) => {
      if (index > 0) map[section.id] = true;
    });
    return map;
  });
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [confirmRemoveId, setConfirmRemoveId] = useState<string | null>(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [bulkLinksOpen, setBulkLinksOpen] = useState(false);
  const [bulkLinksText, setBulkLinksText] = useState("");
  const [publishConfirmOpen, setPublishConfirmOpen] = useState(false);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [scheduledAt, setScheduledAt] = useState<string | null>(initialScheduledPublishAt ?? null);
  const [scheduleSaving, setScheduleSaving] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versions, setVersions] = useState<Array<{ id: string; label: string | null; created_at: string }>>([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [productList, setProductList] = useState<Array<{ id: string; name: string; priceCents: number; currency: string; active: boolean; imageUrl: string | null }>>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [variantList, setVariantList] = useState<Array<{ id: string; name: string; weight: number; enabled: boolean; sections: unknown; views: number; conversions: number; updated_at: string }>>([]);
  const [variantsLoading, setVariantsLoading] = useState(false);
  const [variantName, setVariantName] = useState("Variant B");
  const [variantWeight, setVariantWeight] = useState(50);
  const [editorTab, setEditorTab] = useState<"sections" | "style" | "settings">("sections");
  const [pending, start] = useTransition();
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);

  // Undo/redo history of the editable surface (sections + theme + css).
  type Snapshot = { sections: Sections; themeId: string; customCss: string };
  const [past, setPast] = useState<Snapshot[]>([]);
  const [future, setFuture] = useState<Snapshot[]>([]);
  const skipHistory = useRef(false);

  const saveSequence = useRef(0);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  const validationById = new Map<string, string>();
  for (const section of sections) {
    const issue = getSectionValidationMessage(section);
    if (issue) validationById.set(section.id, issue);
  }

  const currentSnapshot = JSON.stringify({ sections, themeId, customCss });
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState(() => JSON.stringify({ sections: initial, themeId: initialThemeId, customCss: initialCustomCss }));
  const isDirty = currentSnapshot !== lastSavedSnapshot;
  const previewTheme = getThemePreset(themeId);
  const previewCustomCss = sanitizeCss(customCss);

  // Style studio: parsed from customCss prefix, persisted back into it.
  const { studio, rest: customCssRest } = readStyleStudio(customCss);
  function setStudio(next: StyleStudio) {
    pushHistory();
    setCustomCssState(writeStyleStudio(next, customCssRest));
    markDirty();
  }

  function pushHistory() {
    if (skipHistory.current) return;
    const snap: Snapshot = { sections, themeId, customCss };
    setPast((p) => [...p.slice(-49), snap]);
    setFuture([]);
  }

  function applySnapshot(snap: Snapshot) {
    skipHistory.current = true;
    setSections(snap.sections);
    setThemeId(snap.themeId);
    setCustomCssState(snap.customCss);
    setTimeout(() => { skipHistory.current = false; }, 0);
  }

  function undo() {
    setPast((p) => {
      if (p.length === 0) return p;
      const next = p.slice(0, -1);
      const target = p[p.length - 1]!;
      const current: Snapshot = { sections, themeId, customCss };
      setFuture((f) => [...f, current]);
      applySnapshot(target);
      setAnnouncement("Undid last change");
      return next;
    });
  }
  function redo() {
    setFuture((f) => {
      if (f.length === 0) return f;
      const next = f.slice(0, -1);
      const target = f[f.length - 1]!;
      const current: Snapshot = { sections, themeId, customCss };
      setPast((p) => [...p, current]);
      applySnapshot(target);
      setAnnouncement("Redid change");
      return next;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const meta = e.metaKey || e.ctrlKey;
      if (!meta) return;
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      if (e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.key === "y") || (e.key === "z" && e.shiftKey)) { e.preventDefault(); redo(); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }); // intentionally re-bind to capture latest closures

  useEffect(() => {
    if (typeof navigator !== "undefined") setIsOnline(navigator.onLine);
    function on() { setIsOnline(true); }
    function off() { setIsOnline(false); }
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);

  function markDirty() {
    setSavedAt(null);
    setErrorMessage(null);
  }

  function addMediaToLibrary(asset: MediaLibraryItem) {
    setMediaLibrary((current) => [asset, ...current.filter((item) => item.id !== asset.id)].slice(0, 24));
  }

  async function persistDraftState(nextSnapshot: string) {
    const draftResult = await saveDraft(sections, profileId);
    if (!draftResult.ok) return draftResult;

    const [themeResult, cssResult] = await Promise.all([
      setTheme({ id: getThemePreset(themeId).id }, profileId),
      setCustomCss(customCss, profileId),
    ]);
    if (!themeResult.ok) return themeResult;
    if (!cssResult.ok) return cssResult;

    void nextSnapshot;
    return { ok: true as const };
  }

  useEffect(() => {
    if (!isDirty || validationById.size > 0) return;

    const timeout = window.setTimeout(() => {
      const sequence = ++saveSequence.current;
      const snapshot = currentSnapshot;
      start(async () => {
        const result = await persistDraftState(snapshot);
        if (sequence !== saveSequence.current) return;
        if (!result.ok) {
          setErrorMessage(result.error ?? "Unable to save draft.");
          return;
        }
        setErrorMessage(null);
        setLastSavedSnapshot(snapshot);
        setSavedAt(`Autosaved ${new Date().toLocaleTimeString()}`);
      });
    }, 1200);

    return () => window.clearTimeout(timeout);
  }, [currentSnapshot, isDirty, profileId, themeId, customCss, sections, validationById.size]);

  useEffect(() => {
    if (!isDirty) return;

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  function addSection(type: typeof SECTION_TYPES[number]) {
    const id = crypto.randomUUID();
    const base = { id, type, visible: true } as const;
    let nextSection: SectionRecord;
    switch (type) {
      case "header": nextSection = { ...base, type, props: { name: "Your name", showVerified: true, coverFullBleed: false } }; break;
      case "link": nextSection = { ...base, type, props: { label: "New link", url: "https://example.com", style: "pill" } }; break;
      case "image": nextSection = { ...base, type, props: { src: "https://placehold.co/600x600", alt: "", rounded: true } }; break;
      case "spotify": nextSection = { ...base, type, props: { uri: "spotify:track:11dFghVXANMlKmJXsNCbNl" } }; break;
      case "youtube": nextSection = { ...base, type, props: { id: "dQw4w9WgXcQ" } }; break;
      case "social": nextSection = { ...base, type, props: { items: [{ platform: "instagram", handle: "voidluxury" }] } }; break;
      case "qr": nextSection = { ...base, type, props: { url: `https://vcard.ed5enterprise.com/u/${username}` } }; break;
      case "schedule": nextSection = { ...base, type, props: { provider: "calcom", url: "https://cal.com/your" } }; break;
      case "tip": nextSection = { ...base, type, props: { stripeAccountId: "acct_xxx", amounts: [200, 500, 1000] } }; break;
      case "divider": nextSection = { ...base, type, props: {} }; break;
      case "spacer": nextSection = { ...base, type, props: { height: 24 } }; break;
      case "markdown": nextSection = { ...base, type, props: { md: "Hello, world." } }; break;
      case "form": nextSection = { ...base, type, props: { title: "Get in touch", fields: [{ name: "email", label: "Email", type: "email", required: true }], successMessage: "Thanks!", proLeadMode: false, requireConsent: false, requireCaptcha: false } }; break;
      case "video": nextSection = { ...base, type, props: { src: "https://example.com/video.mp4" } }; break;
      case "map": nextSection = { ...base, type, props: { lat: 40.7128, lng: -74.006, label: "NYC" } }; break;
      case "embed": nextSection = { ...base, type, props: { html: "<p>Embed</p>", height: 300, autoHeight: false, allowDomains: [] } }; break;
      case "gallery": nextSection = { ...base, type, props: { images: [{ src: "https://placehold.co/600", alt: "" }], layout: "grid", lightbox: true } }; break;
      case "store": nextSection = { ...base, type, props: { title: "Shop", productIds: [], layout: "grid", showPrice: true, buttonLabel: "Buy now" } }; break;
    }

    pushHistory();
    markDirty();
    setSections((prev) => [...prev, nextSection]);
    setCollapsed((prev) => ({ ...prev, [id]: false }));
    setAddMenuOpen(false);
    setAnnouncement(`Added ${type} section`);
  }

  async function openProductPicker() {
    setProductPickerOpen(true);
    if (productList.length > 0) return;
    setProductsLoading(true);
    try {
      const r = await listOwnedSellerProducts();
      if (r.ok) setProductList(r.products.filter((p) => p.active));
    } finally {
      setProductsLoading(false);
    }
  }

  function insertProductLink(p: { id: string; name: string }) {
    const sectionId = crypto.randomUUID();
    const nextSection: SectionRecord = {
      id: sectionId,
      type: "store",
      visible: true,
      props: { title: p.name, productIds: [p.id], layout: "grid", showPrice: true, buttonLabel: "Buy now" },
    };
    pushHistory();
    markDirty();
    setSections((prev) => [...prev, nextSection]);
    setCollapsed((prev) => ({ ...prev, [sectionId]: false }));
    setProductPickerOpen(false);
    setAnnouncement(`Added store section for ${p.name}`);
  }

  function applyTemplate(templateId: string) {
    const tpl = SECTION_TEMPLATES.find((t) => t.id === templateId);
    if (!tpl) return;
    pushHistory();
    markDirty();
    const built = tpl.build(username);
    setSections(built);
    const firstId = built[0]?.id;
    setCollapsed(() => Object.fromEntries(built.map((s, i) => [s.id, i > 0])));
    if (firstId) setCollapsed((p) => ({ ...p, [firstId]: false }));
    setTemplatesOpen(false);
    setAnnouncement(`Loaded ${tpl.name} template`);
  }

  function duplicateSection(index: number) {
    const original = sections[index];
    if (!original) return;
    pushHistory();
    markDirty();
    const copy = { ...original, id: crypto.randomUUID() } as SectionRecord;
    setSections((prev) => {
      const next = [...prev];
      next.splice(index + 1, 0, copy);
      return next as Sections;
    });
    setCollapsed((p) => ({ ...p, [copy.id]: false }));
    setAnnouncement(`Duplicated ${original.type} section`);
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLElement>(`[data-section-row="${copy.id}"]`);
      el?.focus();
    });
  }

  function updateSection(index: number, nextSection: SectionRecord) {
    pushHistory();
    markDirty();
    setSections((prev) => prev.map((section, currentIndex) => currentIndex === index ? nextSection : section) as Sections);
  }

  function move(index: number, dir: -1 | 1) {
    pushHistory();
    markDirty();
    setSections((prev) => {
      const next = [...prev];
      const swapIndex = index + dir;
      if (swapIndex < 0 || swapIndex >= next.length) return prev;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next as Sections;
    });
  }

  function remove(index: number) {
    const target = sections[index];
    const neighbor = sections[index + 1] ?? sections[index - 1];
    pushHistory();
    markDirty();
    setSections((prev) => prev.filter((_, currentIndex) => currentIndex !== index) as Sections);
    if (target) setAnnouncement(`Removed ${target.type} section`);
    if (neighbor) {
      requestAnimationFrame(() => {
        const el = document.querySelector<HTMLElement>(`[data-section-row="${neighbor.id}"]`);
        el?.focus();
      });
    }
  }

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    pushHistory();
    markDirty();
    setSections((prev) => {
      const oldIndex = prev.findIndex((section) => section.id === active.id);
      const newIndex = prev.findIndex((section) => section.id === over.id);
      if (oldIndex === -1 || newIndex === -1) return prev;
      return arrayMove(prev, oldIndex, newIndex) as Sections;
    });
    setAnnouncement("Reordered sections");
  }

  function expandAll() {
    setCollapsed(() => Object.fromEntries(sections.map((s) => [s.id, false])));
    setAnnouncement("Expanded all sections");
  }
  function collapseAll() {
    setCollapsed(() => Object.fromEntries(sections.map((s) => [s.id, true])));
    setAnnouncement("Collapsed all sections");
  }
  function hideAll() {
    pushHistory();
    markDirty();
    setSections((prev) => prev.map((s) => ({ ...s, visible: false })) as Sections);
  }
  function showAll() {
    pushHistory();
    markDirty();
    setSections((prev) => prev.map((s) => ({ ...s, visible: true })) as Sections);
  }

  async function copySectionJson(section: SectionRecord) {
    try {
      await navigator.clipboard.writeText(JSON.stringify(section, null, 2));
      setAnnouncement("Copied section JSON to clipboard");
    } catch {
      setAnnouncement("Could not copy to clipboard");
    }
  }
  async function pasteSectionJson() {
    try {
      const text = await navigator.clipboard.readText();
      const raw = JSON.parse(text);
      const parsed = SectionSchema.safeParse({ ...raw, id: crypto.randomUUID() });
      if (!parsed.success) {
        setErrorMessage("Clipboard does not contain a valid VoidCard section.");
        return;
      }
      pushHistory();
      markDirty();
      setSections((prev) => [...prev, parsed.data]);
      setCollapsed((p) => ({ ...p, [parsed.data.id]: false }));
      setAnnouncement(`Pasted ${parsed.data.type} section`);
    } catch {
      setErrorMessage("Clipboard does not contain valid JSON.");
    }
  }

  async function copyShareUrl() {
    const url = `${typeof window !== "undefined" ? window.location.origin : "https://vcard.ed5enterprise.com"}/u/${username}`;
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 1800);
    } catch {
      setErrorMessage("Could not copy share link.");
    }
  }

  function applyBulkLinks() {
    const lines = bulkLinksText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const newSections: SectionRecord[] = [];
    for (const line of lines) {
      const [labelRaw, urlRaw] = line.includes("|") ? line.split("|") : [line, line];
      const url = (urlRaw ?? labelRaw ?? "").trim();
      const label = (labelRaw ?? url).trim();
      try {
        new URL(url);
      } catch {
        continue;
      }
      newSections.push({
        id: crypto.randomUUID(),
        type: "link",
        visible: true,
        props: { label: label || url, url, style: "pill" },
      });
    }
    if (newSections.length === 0) {
      setErrorMessage("No valid URLs found. Use one URL per line, optionally `Label | https://example.com`.");
      return;
    }
    pushHistory();
    markDirty();
    setSections((prev) => [...prev, ...newSections] as Sections);
    setCollapsed((prev) => {
      const next = { ...prev };
      for (const s of newSections) next[s.id] = true;
      return next;
    });
    setBulkLinksOpen(false);
    setBulkLinksText("");
    setAnnouncement(`Added ${newSections.length} link sections`);
  }

  function getFirstValidationError() {
    for (const section of sections) {
      const issue = validationById.get(section.id);
      if (issue) {
        return `Fix the ${section.type} section before saving: ${issue}`;
      }
    }
    return null;
  }

  function onSave() {
    const validationError = getFirstValidationError();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }

    start(async () => {
      const snapshot = currentSnapshot;
      const sequence = ++saveSequence.current;
      const result = await persistDraftState(snapshot);
      if (sequence !== saveSequence.current) return;
      if (!result.ok) {
        setErrorMessage(result.error ?? "Unable to save draft.");
        return;
      }
      setErrorMessage(null);
      setLastSavedSnapshot(snapshot);
      setSavedAt(`Saved ${new Date().toLocaleTimeString()}`);
    });
  }

  function onPublish() {
    const validationError = getFirstValidationError();
    if (validationError) {
      setErrorMessage(validationError);
      return;
    }
    setPublishConfirmOpen(true);
  }

  async function saveSchedule(iso: string | null) {
    setScheduleSaving(true);
    try {
      const result = await setScheduledPublish(iso, profileId);
      if (!result.ok) {
        setErrorMessage(result.error === "pro_required_scheduled_publish" ? "Scheduled publish is a Pro feature." : (result.error ?? "Could not save schedule."));
        return;
      }
      setScheduledAt(iso);
      setAnnouncement(iso ? `Publish scheduled for ${new Date(iso).toLocaleString()}` : "Schedule cleared");
      setErrorMessage(null);
    } finally {
      setScheduleSaving(false);
    }
  }

  async function refreshVersions() {
    setVersionsLoading(true);
    try {
      const r = await listVersions(profileId);
      if (r.ok) setVersions(r.versions as Array<{ id: string; label: string | null; created_at: string }>);
    } finally {
      setVersionsLoading(false);
    }
  }

  async function snapshotNow() {
    const r = await snapshotVersion(sections, versionLabel.trim() || null, profileId);
    if (!r.ok) {
      setErrorMessage(r.error ?? "Could not save snapshot.");
      return;
    }
    setVersionLabel("");
    setAnnouncement("Snapshot saved");
    if (versionsOpen) await refreshVersions();
  }

  async function restoreFromVersion(versionId: string) {
    if (typeof window !== "undefined" && !window.confirm("Replace your current draft with this version?")) return;
    const r = await restoreVersion(versionId, profileId);
    if (!r.ok) {
      setErrorMessage(r.error ?? "Could not restore version.");
      return;
    }
    setSections(r.sections);
    setAnnouncement("Version restored");
    setVersionsOpen(false);
  }

  async function removeVersion(versionId: string) {
    if (typeof window !== "undefined" && !window.confirm("Delete this snapshot?")) return;
    const r = await deleteVersion(versionId);
    if (!r.ok) {
      setErrorMessage(r.error ?? "Could not delete version.");
      return;
    }
    setVersions((list) => list.filter((v) => v.id !== versionId));
  }

  async function refreshVariants() {
    setVariantsLoading(true);
    try {
      const r = await getVariantB(profileId);
      if (r.ok) setVariantList(r.variants);
    } finally {
      setVariantsLoading(false);
    }
  }

  async function createVariantFromCurrent() {
    const r = await saveVariantB(sections, variantName.trim() || "Variant", variantWeight, false);
    if (!r.ok) {
      setErrorMessage(r.error === "pro_required_ab" ? "A/B variants are a Pro feature." : (r.error ?? "Could not save variant."));
      return;
    }
    setAnnouncement("Variant saved");
    if (variantsOpen) await refreshVariants();
  }

  async function toggleVariant(v: { id: string; name: string; weight: number; enabled: boolean; sections: unknown }) {
    const r = await saveVariantB(v.sections, v.name, v.weight, !v.enabled, v.id);
    if (!r.ok) {
      setErrorMessage(r.error ?? "Could not update variant.");
      return;
    }
    await refreshVariants();
  }

  async function removeVariant(variantId: string) {
    if (typeof window !== "undefined" && !window.confirm("Delete this variant?")) return;
    const r = await deleteVariantB(variantId);
    if (!r.ok) {
      setErrorMessage(r.error ?? "Could not delete variant.");
      return;
    }
    setVariantList((list) => list.filter((v) => v.id !== variantId));
  }

  function confirmedPublish() {
    setPublishConfirmOpen(false);
    start(async () => {
      const snapshot = currentSnapshot;
      const sequence = ++saveSequence.current;
      const saveResult = await persistDraftState(snapshot);
      if (sequence !== saveSequence.current) return;
      if (!saveResult.ok) {
        setErrorMessage(saveResult.error ?? "Unable to save draft.");
        return;
      }

      const publishResult = await publishDraft(profileId);
      if (!publishResult.ok) {
        setErrorMessage(publishResult.error ?? "Unable to publish profile.");
        return;
      }

      setErrorMessage(null);
      setLastSavedSnapshot(snapshot);
      setSavedAt("Published");
      setAnnouncement("Published live");
    });
  }

  return (
    <div className="grid min-w-0 gap-4 md:grid-cols-2 md:gap-6">
      <div
        className={[
          "order-2 min-w-0 md:order-2 md:sticky md:top-24 md:self-start",
          mobilePreviewOpen
            ? "fixed inset-0 z-40 flex flex-col overflow-y-auto bg-onyx-950/95 p-4 backdrop-blur-md md:static md:bg-transparent md:p-0"
            : "hidden md:block",
        ].join(" ")}
        data-testid="preview-column"
      >
        {mobilePreviewOpen ? (
          <div className="mb-3 flex items-center justify-between md:hidden">
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Live preview</p>
            <button
              type="button"
              className="btn-ghost px-3 py-2 text-xs"
              onClick={() => setMobilePreviewOpen(false)}
              data-testid="mobile-preview-close"
            >
              Close
            </button>
          </div>
        ) : null}
        <style dangerouslySetInnerHTML={{ __html: themeToCss(previewTheme, ".vc-profile-preview") }} />
        {previewCustomCss ? <style dangerouslySetInnerHTML={{ __html: previewCustomCss }} /> : null}
        <div className="phone-frame mx-auto">
          <div
            className="vc-profile vc-profile-preview flex h-full flex-col overflow-y-auto overscroll-contain p-5 select-none [&_a]:pointer-events-none [&_button]:pointer-events-none"
            style={{ background: "var(--vc-bg, #0a0a0a)", color: "var(--vc-fg, #f7f3ea)" }}
            data-testid="preview-scroll"
          >
            <div className="space-y-3">
              {sections.map((section) => <PreviewSection key={section.id} section={section} />)}
            </div>
          </div>
        </div>
      </div>

      <div className="order-1 min-w-0 flex flex-col gap-4 pb-24 md:order-1 md:pb-0">
        <button
          type="button"
          onClick={() => setMobilePreviewOpen(true)}
          className="btn-gold w-full px-3 py-3 text-xs uppercase tracking-widest md:hidden"
          data-testid="mobile-preview-open"
        >
          Show live preview
        </button>

        {/* ─── Tab bar ─── */}
        <div role="tablist" className="card flex overflow-hidden p-0">
          {(["sections", "style", "settings"] as const).map((tab) => (
            <button
              key={tab}
              role="tab"
              aria-selected={editorTab === tab}
              onClick={() => setEditorTab(tab)}
              className={[
                "flex-1 px-3 py-3 text-xs uppercase tracking-widest transition",
                editorTab === tab
                  ? "bg-onyx-900 text-gold shadow-[inset_0_-2px_0_rgba(212,168,83,0.8)]"
                  : "text-ivory-mute hover:bg-onyx-900/40 hover:text-ivory",
              ].join(" ")}
            >
              {tab === "sections" ? "Sections" : tab === "style" ? "Style" : "Settings"}
            </button>
          ))}
        </div>

        {/* ─── Settings tab ─── */}
        {editorTab === "settings" ? <div className="space-y-4">

        <section className="card flex flex-wrap items-center justify-between gap-3 p-4" data-testid="share-row">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Public profile</p>
            <p className="truncate font-display text-sm text-ivory">{`/u/${username}`}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/u/${username}`} target="_blank" rel="noopener noreferrer" className="btn-ghost px-3 py-2 text-xs">Open live</Link>
            <button type="button" onClick={copyShareUrl} className="btn-ghost px-3 py-2 text-xs" data-testid="copy-share">
              {shareCopied ? "Copied!" : "Copy link"}
            </button>
            <details className="relative">
              <summary className="btn-ghost cursor-pointer list-none px-3 py-2 text-xs">QR</summary>
              <div className="absolute right-0 z-10 mt-2 rounded-card border border-onyx-700 bg-onyx-950 p-3 shadow-xl">
                <BrandedQR
                  value={`https://vcard.ed5enterprise.com/u/${username}`}
                  size={200}
                  variant="onyx"
                  ariaLabel={`QR for /u/${username}`}
                  className="rounded-card"
                />
              </div>
            </details>
          </div>
        </section>

        <StorageMeter />

        <section className="card space-y-3 p-4" data-testid="schedule-publish">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-ivory-mute">Scheduled publish {canSchedule ? "" : "(Pro)"}</p>
              <p className="mt-1 text-xs text-ivory-dim">
                {scheduledAt
                  ? `Will go live at ${new Date(scheduledAt).toLocaleString()}.`
                  : "Pick a future date/time to auto-publish your latest draft."}
              </p>
            </div>
            {scheduledAt ? (
              <button
                type="button"
                className="btn-ghost px-3 py-2 text-xs"
                onClick={() => saveSchedule(null)}
                disabled={scheduleSaving}
                data-testid="clear-schedule"
              >
                Clear
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="datetime-local"
              className={INPUT_CLASS_NAME + " max-w-[260px]"}
              value={scheduledAt ? toLocalDatetime(scheduledAt) : ""}
              disabled={!canSchedule || scheduleSaving}
              onChange={(e) => {
                const v = e.target.value;
                if (!v) return;
                const iso = new Date(v).toISOString();
                saveSchedule(iso);
              }}
              data-testid="schedule-input"
            />
            {!canSchedule ? (
              <Link href="/account/billing" className="text-xs text-gold underline-offset-2 hover:underline">Upgrade to Pro</Link>
            ) : null}
          </div>
        </section>

        <section className="card space-y-3 p-4" data-testid="versions-panel">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Versions</p>
            <button
              type="button"
              className="text-xs text-gold underline-offset-2 hover:underline"
              onClick={async () => {
                const next = !versionsOpen;
                setVersionsOpen(next);
                if (next) await refreshVersions();
              }}
              data-testid="versions-toggle"
            >
              {versionsOpen ? "Hide history" : "Show history"}
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              className={INPUT_CLASS_NAME + " max-w-[260px]"}
              placeholder="Snapshot label (optional)"
              value={versionLabel}
              maxLength={80}
              onChange={(e) => setVersionLabel(e.target.value)}
              data-testid="snapshot-label"
            />
            <button
              type="button"
              className="btn-ghost px-3 py-2 text-xs"
              onClick={snapshotNow}
              data-testid="snapshot-save"
            >
              Save snapshot
            </button>
          </div>
          {versionsOpen ? (
            <ul className="space-y-1 text-xs" data-testid="versions-list">
              {versionsLoading ? (
                <li className="text-ivory-dim">Loading…</li>
              ) : versions.length === 0 ? (
                <li className="text-ivory-dim">No snapshots yet.</li>
              ) : (
                versions.map((v) => (
                  <li key={v.id} className="flex items-center justify-between gap-2 rounded border border-ivory/10 px-2 py-1.5">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-ivory">{v.label || "Untitled"}</p>
                      <p className="text-ivory-dim">{new Date(v.created_at).toLocaleString()}</p>
                    </div>
                    <button type="button" className="text-gold hover:underline" onClick={() => restoreFromVersion(v.id)} data-testid="version-restore">
                      Restore
                    </button>
                    <button type="button" className="text-ivory-dim hover:text-red-400" onClick={() => removeVersion(v.id)} aria-label="Delete snapshot">
                      ×
                    </button>
                  </li>
                ))
              )}
            </ul>
          ) : null}
        </section>

        <section className="card space-y-3 p-4" data-testid="variants-panel">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-widest text-ivory-mute">A/B variants {canAbVariants ? "" : "(Pro)"}</p>
            <button
              type="button"
              className="text-xs text-gold underline-offset-2 hover:underline"
              onClick={async () => {
                const next = !variantsOpen;
                setVariantsOpen(next);
                if (next) await refreshVariants();
              }}
              data-testid="variants-toggle"
            >
              {variantsOpen ? "Hide variants" : "Show variants"}
            </button>
          </div>
          {canAbVariants === false ? (
            <p className="text-xs text-ivory-dim">
              Pro feature. <Link href="/account/billing" className="text-gold underline-offset-2 hover:underline">Upgrade</Link> to run A/B tests on your published profile.
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  className={INPUT_CLASS_NAME + " max-w-[200px]"}
                  placeholder="Variant name"
                  value={variantName}
                  maxLength={80}
                  onChange={(e) => setVariantName(e.target.value)}
                  data-testid="variant-name"
                />
                <label className="flex items-center gap-1 text-xs text-ivory-mute">
                  Weight
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className={INPUT_CLASS_NAME + " w-20"}
                    value={variantWeight}
                    onChange={(e) => setVariantWeight(Number(e.target.value) || 0)}
                    data-testid="variant-weight"
                  />
                  %
                </label>
                <button
                  type="button"
                  className="btn-ghost px-3 py-2 text-xs"
                  onClick={createVariantFromCurrent}
                  data-testid="variant-create"
                >
                  Save current as variant
                </button>
              </div>
              {variantsOpen ? (
                <ul className="space-y-1 text-xs" data-testid="variants-list">
                  {variantsLoading ? (
                    <li className="text-ivory-dim">Loading…</li>
                  ) : variantList.length === 0 ? (
                    <li className="text-ivory-dim">No variants yet.</li>
                  ) : (
                    variantList.map((v) => (
                      <li key={v.id} className="flex items-center justify-between gap-2 rounded border border-ivory/10 px-2 py-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-ivory">{v.name} <span className="text-ivory-dim">· {v.weight}%</span></p>
                          <p className="text-ivory-dim">Views {v.views} · Conv {v.conversions}</p>
                        </div>
                        <button
                          type="button"
                          className={v.enabled ? "text-gold hover:underline" : "text-ivory-dim hover:text-ivory"}
                          onClick={() => toggleVariant(v)}
                          data-testid="variant-toggle"
                        >
                          {v.enabled ? "Live" : "Paused"}
                        </button>
                        <button type="button" className="text-ivory-dim hover:text-red-400" onClick={() => removeVariant(v.id)} aria-label="Delete variant">
                          ×
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              ) : null}
            </>
          )}
        </section>

        </div> : null}

        {/* ─── Style tab ─── */}
        {editorTab === "style" ? <div className="space-y-4">

        <section className="card space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-widest text-ivory-mute">Profile styling</p>
              <p className="mt-2 text-sm text-ivory-dim">Theme and custom CSS now live inside the editor and autosave with your draft.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-ivory-mute">
              <Link href="/fonts" className="btn-ghost px-3 py-2 text-xs">Manage fonts</Link>
              {mediaLibrary.length > 0 ? <span>{mediaLibrary.length} recent uploads</span> : null}
            </div>
          </div>

          {/* Theme picker — compact dropdown with swatch preview */}
          <div className="space-y-2">
            <label className="block space-y-1">
              <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Theme</span>
              <select
                value={themeId ?? ""}
                onChange={(e) => {
                  pushHistory();
                  markDirty();
                  setThemeId(e.target.value);
                }}
                className="w-full rounded-card border border-onyx-700 bg-onyx-950 px-3 py-2.5 text-sm text-ivory outline-none transition focus:border-gold/60"
              >
                {THEME_PRESETS.map((theme) => (
                  <option key={theme.id} value={theme.id}>{theme.name}</option>
                ))}
              </select>
            </label>
            {/* Color swatches + description for selected theme */}
            {(() => {
              const active = THEME_PRESETS.find((t) => t.id === themeId);
              if (!active) return null;
              return (
                <div className="flex items-center gap-3 rounded-card border border-onyx-700 bg-onyx-950/60 px-3 py-2">
                  <div className="flex gap-1.5">
                    <span className="size-4 rounded-full border border-white/10" style={{ backgroundColor: active.preview.bg }} />
                    <span className="size-4 rounded-full border border-white/10" style={{ backgroundColor: active.preview.fg }} />
                    <span className="size-4 rounded-full border border-white/10" style={{ backgroundColor: active.preview.accent }} />
                  </div>
                  <p className="text-xs text-ivory-mute">{active.description}</p>
                </div>
              );
            })()}
          </div>

          <Field label="Custom CSS">
            <textarea
              className={TEXTAREA_CLASS_NAME}
              value={customCss}
              spellCheck={false}
              maxLength={30000}
              onChange={(event) => {
                pushHistory();
                markDirty();
                setCustomCssState(event.target.value);
              }}
              placeholder=".vc-profile { letter-spacing: 0.02em; }"
            />
          </Field>
        </section>

        <StyleStudioPanel studio={studio} onChange={setStudio} />

        </div> : null}

        {/* ─── Sections tab ─── */}
        {editorTab === "sections" ? <div className="space-y-4">

        <div className="relative">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs uppercase tracking-widest text-ivory-mute">Sections</p>
              <p className="mt-1 text-sm text-ivory-dim">
                {sections.length === 0
                  ? "Your profile is empty — add your first section below."
                  : "Tap a row to expand it. Drag the handle to reorder. Use ↑/↓ keys after focusing the handle."}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setTemplatesOpen((o) => !o)}
                className="btn-ghost px-3 py-2 text-xs"
                aria-expanded={templatesOpen}
                data-testid="templates-trigger"
              >
                Templates…
              </button>
              <button
                type="button"
                onClick={() => setAddMenuOpen((open) => !open)}
                className="btn-gold px-4 py-2 text-sm"
                aria-expanded={addMenuOpen}
                aria-haspopup="menu"
                data-testid="add-section-trigger"
              >
                {addMenuOpen ? "Close" : "+ Add section"}
              </button>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter sections…"
              className={`${INPUT_CLASS_NAME} max-w-xs`}
              data-testid="section-filter"
            />
            <button type="button" onClick={expandAll} className="btn-ghost px-3 py-2 text-xs">Expand all</button>
            <button type="button" onClick={collapseAll} className="btn-ghost px-3 py-2 text-xs">Collapse all</button>
            <button type="button" onClick={hideAll} className="btn-ghost px-3 py-2 text-xs">Hide all</button>
            <button type="button" onClick={showAll} className="btn-ghost px-3 py-2 text-xs">Show all</button>
            <button type="button" onClick={pasteSectionJson} className="btn-ghost px-3 py-2 text-xs" data-testid="paste-section">Paste section</button>
            <button type="button" onClick={() => setBulkLinksOpen(true)} className="btn-ghost px-3 py-2 text-xs" data-testid="bulk-links-trigger">Bulk add links</button>
            <button type="button" onClick={openProductPicker} className="btn-ghost px-3 py-2 text-xs" data-testid="product-picker-trigger">Add product link</button>
          </div>
          <AnimatePresence>
            {templatesOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="card mt-3 grid gap-2 p-3 sm:grid-cols-2"
                data-testid="templates-menu"
              >
                {SECTION_TEMPLATES.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => applyTemplate(tpl.id)}
                    className="rounded-card border border-onyx-700 bg-onyx-950/50 px-3 py-3 text-left hover:border-gold/40"
                    data-testid={`template-${tpl.id}`}
                  >
                    <p className="font-display text-sm text-ivory">{tpl.name}</p>
                    <p className="mt-1 text-xs text-ivory-mute">{tpl.description}</p>
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
          <AnimatePresence>
            {addMenuOpen ? (
              <motion.div
                role="menu"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.18, ease: "easeOut" }}
                className="card mt-3 grid grid-cols-1 gap-2 p-3 sm:grid-cols-2 lg:grid-cols-3"
                data-testid="add-section-menu"
              >
                {SECTION_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => addSection(type)}
                    data-testid={`add-${type}`}
                    className="flex min-w-0 items-center gap-2 truncate rounded-card border border-onyx-700 bg-onyx-950/50 px-3 py-2 text-left text-xs uppercase tracking-widest text-ivory hover:border-gold/40 hover:text-gold"
                  >
                    <span aria-hidden className="text-gold">+</span>
                    {type}
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
          <SortableContext items={sections.map((section) => section.id)} strategy={verticalListSortingStrategy}>
            <motion.ul layout className="space-y-3" data-testid="section-list">
              <AnimatePresence initial={false}>
                {sections.map((section, index) => {
                  if (filter && !sectionMatchesFilter(section, filter)) return null;
                  return (
                  <SortableSectionRow
                    key={section.id}
                    section={section}
                    index={index}
                    validationMessage={validationById.get(section.id) ?? null}
                    recentMedia={mediaLibrary}
                    collapsed={collapsed[section.id] ?? false}
                    onToggleCollapsed={() =>
                      setCollapsed((prev) => ({ ...prev, [section.id]: !(prev[section.id] ?? false) }))
                    }
                    onChange={(nextSection) => updateSection(index, nextSection)}
                    onMediaAdded={addMediaToLibrary}
                    onMove={move}
                    onRemove={() => setConfirmRemoveId(section.id)}
                    onDuplicate={() => duplicateSection(index)}
                    onCopyJson={() => copySectionJson(section)}
                  />
                  );
                })}
              </AnimatePresence>
            </motion.ul>
          </SortableContext>
        </DndContext>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={undo} disabled={past.length === 0} className="btn-ghost px-3 py-2 text-xs" aria-label="Undo" title="Undo (Ctrl+Z)" data-testid="undo">↶ Undo</button>
          <button type="button" onClick={redo} disabled={future.length === 0} className="btn-ghost px-3 py-2 text-xs" aria-label="Redo" title="Redo (Ctrl+Shift+Z)" data-testid="redo">↷ Redo</button>
          <button type="button" onClick={onSave} disabled={pending} className="btn-ghost" data-testid="save-draft">Save draft</button>
          <button type="button" onClick={onPublish} disabled={pending} className="btn-gold" data-testid="publish">Publish</button>
          <AutosaveStatus
            isOnline={isOnline}
            pending={pending}
            isDirty={isDirty}
            savedAt={savedAt}
            hasErrors={validationById.size > 0}
          />
        </div>

        </div> : null}

        {errorMessage && (
          <p className="rounded-card border border-red-400/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
            {errorMessage}
          </p>
        )}
      </div>

      <span aria-live="polite" className="sr-only" data-testid="editor-announcer">{announcement}</span>

      <AnimatePresence>
        {confirmRemoveId ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            data-testid="confirm-remove"
          >
            <div className="card max-w-sm space-y-3 p-5 text-sm">
              <p className="font-display text-lg text-ivory">Remove this section?</p>
              <p className="text-xs text-ivory-mute">This cannot be undone after publishing. You can press Ctrl+Z to bring it back before publishing.</p>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={() => setConfirmRemoveId(null)}>Cancel</button>
                <button
                  type="button"
                  className="btn-gold px-3 py-2 text-xs"
                  data-testid="confirm-remove-yes"
                  onClick={() => {
                    const idx = sections.findIndex((s) => s.id === confirmRemoveId);
                    if (idx >= 0) remove(idx);
                    setConfirmRemoveId(null);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          </motion.div>
        ) : null}
        {bulkLinksOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            data-testid="bulk-links-modal"
          >
            <div className="card w-full max-w-lg space-y-3 p-5 text-sm">
              <p className="font-display text-lg text-ivory">Bulk add links</p>
              <p className="text-xs text-ivory-mute">One link per line. Format: <code className="rounded bg-onyx-950 px-1 py-0.5">Label | https://example.com</code> or just a URL.</p>
              <textarea
                className={TEXTAREA_CLASS_NAME}
                rows={8}
                value={bulkLinksText}
                onChange={(e) => setBulkLinksText(e.target.value)}
                data-testid="bulk-links-textarea"
                placeholder={"Portfolio | https://example.com\nhttps://github.com/me"}
              />
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={() => setBulkLinksOpen(false)}>Cancel</button>
                <button type="button" className="btn-gold px-3 py-2 text-xs" data-testid="bulk-links-apply" onClick={applyBulkLinks}>Add links</button>
              </div>
            </div>
          </motion.div>
        ) : null}
        {productPickerOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            data-testid="product-picker-modal"
          >
            <div className="card w-full max-w-lg space-y-3 p-5 text-sm">
              <div className="flex items-center justify-between">
                <p className="font-display text-lg text-ivory">Add a product</p>
                <button type="button" className="text-ivory-dim hover:text-ivory" onClick={() => setProductPickerOpen(false)} aria-label="Close">×</button>
              </div>
              <p className="text-xs text-ivory-mute">Inserts a Store section for one of your products. Manage your catalog at <a className="text-gold underline" href="/account/products">/account/products</a>.</p>
              {productsLoading ? (
                <p className="text-xs text-ivory-dim">Loading products…</p>
              ) : productList.length === 0 ? (
                <p className="text-xs text-ivory-dim">You haven&apos;t added any products yet. <a className="text-gold underline" href="/account/products">Add one →</a></p>
              ) : (
                <ul className="max-h-80 space-y-1 overflow-auto" data-testid="product-picker-list">
                  {productList.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between gap-3 rounded border border-ivory/10 px-3 py-2 text-left hover:border-gold/40"
                        onClick={() => insertProductLink(p)}
                        data-testid={`product-pick-${p.id}`}
                      >
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-ivory">{p.name}</span>
                        </span>
                        <span className="text-xs text-gold">${(p.priceCents / 100).toFixed(2)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </motion.div>
        ) : null}
        {publishConfirmOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
            role="dialog"
            aria-modal="true"
            data-testid="publish-confirm"
          >
            <div className="card max-w-md space-y-3 p-5 text-sm">
              <p className="font-display text-lg text-ivory">Publish to your live profile?</p>
              <p className="text-xs text-ivory-mute">
                {isDirty
                  ? "You have unsaved changes. They will be saved and pushed live to "
                  : "Your latest saved draft will be pushed live to "}
                <code className="rounded bg-onyx-950 px-1 py-0.5">/u/{username}</code>.
              </p>
              <p className="text-xs text-ivory-mute">{sections.filter((s) => s.visible).length} visible sections · {sections.filter((s) => !s.visible).length} hidden.</p>
              <div className="flex justify-end gap-2">
                <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={() => setPublishConfirmOpen(false)}>Cancel</button>
                <button type="button" className="btn-gold px-3 py-2 text-xs" data-testid="publish-confirm-yes" onClick={confirmedPublish}>Publish now</button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-3 pb-[max(env(safe-area-inset-bottom),0.5rem)] md:hidden"
        data-testid="mobile-action-bar"
      >
        <div className="pointer-events-auto flex w-full max-w-md items-center justify-between gap-2 rounded-full border border-onyx-700 bg-onyx-950/95 px-3 py-2 shadow-2xl backdrop-blur">
          <button type="button" onClick={undo} disabled={past.length === 0} className="btn-ghost px-3 py-2 text-xs" aria-label="Undo">↶</button>
          <button type="button" onClick={redo} disabled={future.length === 0} className="btn-ghost px-3 py-2 text-xs" aria-label="Redo">↷</button>
          <button
            type="button"
            onClick={() => setMobilePreviewOpen(true)}
            className="btn-ghost px-3 py-2 text-xs"
            data-testid="mobile-preview-open"
          >
            👁 Preview
          </button>
          <button type="button" onClick={onSave} disabled={pending} className="btn-ghost px-3 py-2 text-xs">Save</button>
          <button type="button" onClick={onPublish} disabled={pending} className="btn-gold px-3 py-2 text-xs">Publish</button>
        </div>
      </div>
    </div>
  );
}

function StorageMeter() {
  const [state, setState] = useState<{ used: number; quota: number } | null>(null);
  useEffect(() => {
    let cancelled = false;
    getStorageUsage().then((r) => {
      if (cancelled || !r.ok) return;
      setState({ used: r.used, quota: r.quota });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  if (!state) return null;
  const pct = state.quota > 0 ? Math.min(100, Math.round((state.used / state.quota) * 100)) : 0;
  const usedGb = (state.used / 1_073_741_824).toFixed(2);
  const quotaGb = (state.quota / 1_073_741_824).toFixed(0);
  const tone = pct >= 90 ? "bg-red-500" : pct >= 75 ? "bg-amber-400" : "bg-gold";
  return (
    <section className="card space-y-2 p-4" data-testid="storage-meter">
      <div className="flex items-center justify-between text-xs">
        <span className="uppercase tracking-widest text-ivory-mute">Storage</span>
        <span className="text-ivory-dim">{usedGb} / {quotaGb} GB</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-onyx-900">
        <div className={`h-full ${tone}`} style={{ width: `${pct}%` }} />
      </div>
      {pct >= 90 ? (
        <p className="text-xs text-red-300">You&apos;re near your storage cap. Delete unused media or upgrade your plan.</p>
      ) : null}
    </section>
  );
}
