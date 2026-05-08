"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { capture } from "@/lib/posthog-browser";
import { saveDesignAction } from "../actions";
import type { DesignDoc, DesignItem } from "./types";

// CR80 ID-1 card at 300 DPI. Canvas is "logical" — visually scaled to viewport.
const CARD_W = 1011;
const CARD_H = 638;
const ASPECT = CARD_W / CARD_H; // ~1.586

type Side = "front" | "back";
type CustomFont = { family: string; url: string };

const SNAP_POINTS = [0, 40, 72, CARD_W / 2, CARD_W - 72, CARD_W - 40, CARD_W];
const SNAP_Y_POINTS = [0, 40, 72, CARD_H / 2, CARD_H - 72, CARD_H - 40, CARD_H];
const SNAP_THRESHOLD = 12;

const ONYX_GOLD_FRONT: DesignItem[] = [
  {
    type: "rect",
    id: "bg",
    x: 0,
    y: 0,
    width: CARD_W,
    height: CARD_H,
    fill: "#0a0a0a",
  },
  {
    type: "rect",
    id: "hairline",
    x: 40,
    y: CARD_H - 80,
    width: CARD_W - 80,
    height: 1,
    fill: "#c8a052",
  },
  {
    type: "text",
    id: "name",
    x: 56,
    y: 80,
    text: "Your Name",
    fill: "#f5e7c4",
    fontSize: 72,
    fontFamily: "serif",
  },
  {
    type: "text",
    id: "tagline",
    x: 56,
    y: 180,
    text: "Tap to connect",
    fill: "#c8a052",
    fontSize: 28,
    fontFamily: "sans-serif",
  },
];

const ONYX_GOLD_BACK: DesignItem[] = [
  {
    type: "rect",
    id: "bg",
    x: 0,
    y: 0,
    width: CARD_W,
    height: CARD_H,
    fill: "#0a0a0a",
  },
  {
    type: "text",
    id: "logo",
    x: CARD_W / 2 - 120,
    y: CARD_H / 2 - 40,
    text: "VOIDCARD",
    fill: "#c8a052",
    fontSize: 56,
    fontFamily: "serif",
  },
];

const MINIMAL_FRONT: DesignItem[] = [
  { type: "rect", id: "bg", x: 0, y: 0, width: CARD_W, height: CARD_H, fill: "#f5e7c4" },
  { type: "text", id: "name", x: 64, y: 72, text: "Your Name", fill: "#0a0a0a", fontSize: 72, fontFamily: "serif" },
  { type: "text", id: "role", x: 66, y: 170, text: "Founder / Creative Director", fill: "#3f3627", fontSize: 28, fontFamily: "sans-serif" },
  { type: "rect", id: "mark", x: CARD_W - 154, y: 72, width: 90, height: 90, fill: "#c8a052", cornerRadius: 45 },
];

const MINIMAL_BACK: DesignItem[] = [
  { type: "rect", id: "bg", x: 0, y: 0, width: CARD_W, height: CARD_H, fill: "#f5e7c4" },
  { type: "text", id: "tap", x: 72, y: CARD_H - 130, text: "Tap to connect", fill: "#0a0a0a", fontSize: 40, fontFamily: "sans-serif" },
];

const EDITORIAL_FRONT: DesignItem[] = [
  { type: "rect", id: "bg", x: 0, y: 0, width: CARD_W, height: CARD_H, fill: "#111827" },
  { type: "rect", id: "band", x: 0, y: 0, width: 180, height: CARD_H, fill: "#c8a052" },
  { type: "text", id: "name", x: 240, y: 92, text: "Your Name", fill: "#ffffff", fontSize: 68, fontFamily: "serif" },
  { type: "text", id: "detail", x: 242, y: 190, text: "Strategy · Design · Growth", fill: "#c8a052", fontSize: 28, fontFamily: "sans-serif" },
];

const EDITORIAL_BACK: DesignItem[] = [
  { type: "rect", id: "bg", x: 0, y: 0, width: CARD_W, height: CARD_H, fill: "#111827" },
  { type: "text", id: "brand", x: 72, y: 82, text: "VOIDCARD", fill: "#c8a052", fontSize: 48, fontFamily: "serif" },
  { type: "rect", id: "line", x: 72, y: 150, width: CARD_W - 144, height: 2, fill: "#c8a052" },
];

const TEMPLATES = [
  { id: "onyx", name: "Onyx Gold", front: ONYX_GOLD_FRONT, back: ONYX_GOLD_BACK },
  { id: "minimal", name: "Ivory Minimal", front: MINIMAL_FRONT, back: MINIMAL_BACK },
  { id: "editorial", name: "Editorial Bar", front: EDITORIAL_FRONT, back: EDITORIAL_BACK },
] as const;

function makeId() {
  return `i_${Math.random().toString(36).slice(2, 9)}`;
}

function ensureTemplate(doc: DesignDoc): DesignDoc {
  const front = doc.front?.items?.length ? doc.front.items : ONYX_GOLD_FRONT.map((i) => ({ ...i }));
  const back = doc.back?.items?.length ? doc.back.items : ONYX_GOLD_BACK.map((i) => ({ ...i }));
  return { w: CARD_W, h: CARD_H, front: { items: front }, back: { items: back } };
}

function cloneItems(items: DesignItem[]) {
  return items.map((item) => ({ ...item }));
}

function itemSize(item: DesignItem) {
  if (item.type === "text") {
    return {
      width: item.width ?? Math.max(80, item.text.length * item.fontSize * 0.52),
      height: item.fontSize * 1.25,
    };
  }
  return { width: item.width, height: item.height };
}

function nearest(value: number, points: number[]) {
  let snapped = value;
  let best = SNAP_THRESHOLD + 1;
  for (const point of points) {
    const diff = Math.abs(value - point);
    if (diff < best) {
      best = diff;
      snapped = point;
    }
  }
  return best <= SNAP_THRESHOLD ? snapped : value;
}

function snapItem(item: DesignItem, x: number, y: number) {
  const size = itemSize(item);
  const left = nearest(x, SNAP_POINTS);
  const centerX = nearest(x + size.width / 2, SNAP_POINTS);
  const right = nearest(x + size.width, SNAP_POINTS);
  const top = nearest(y, SNAP_Y_POINTS);
  const centerY = nearest(y + size.height / 2, SNAP_Y_POINTS);
  const bottom = nearest(y + size.height, SNAP_Y_POINTS);
  return {
    x: right !== x + size.width ? right - size.width : centerX !== x + size.width / 2 ? centerX - size.width / 2 : left,
    y: bottom !== y + size.height ? bottom - size.height : centerY !== y + size.height / 2 ? centerY - size.height / 2 : top,
  };
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

async function uploadDesignerAsset(input: {
  body: Blob;
  filename: string;
  mime: string;
  width?: number;
  height?: number;
}) {
  const signResponse = await fetch("/api/media/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: input.filename,
      mime: input.mime,
      sizeBytes: input.body.size,
      kind: "image",
      visibility: "public",
    }),
  });
  const signBody = await signResponse.json().catch(() => ({}));
  if (!signResponse.ok || !signBody.ok) {
    throw new Error(uploadErrorMessage(signBody.error));
  }

  const uploadResponse = await fetch(String(signBody.signedUrl), {
    method: "PUT",
    headers: { "content-type": input.mime },
    body: input.body,
  });
  if (!uploadResponse.ok) throw new Error("Upload failed. Try again.");

  const finalizeResponse = await fetch("/api/media/finalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      bucket: signBody.bucket,
      path: signBody.path,
      kind: "image",
      mime: input.mime,
      sizeBytes: input.body.size,
      width: input.width ? Math.round(input.width) : undefined,
      height: input.height ? Math.round(input.height) : undefined,
    }),
  });
  const finalizeBody = await finalizeResponse.json().catch(() => ({}));
  if (!finalizeResponse.ok || !finalizeBody.ok || typeof finalizeBody.url !== "string") {
    throw new Error(uploadErrorMessage(finalizeBody.error));
  }
  return String(finalizeBody.url);
}

async function imageDimensions(src: string) {
  return new Promise<{ width: number; height: number }>((resolve, reject) => {
    const probe = new Image();
    probe.onload = () => resolve({ width: probe.width, height: probe.height });
    probe.onerror = () => reject(new Error("Could not read image."));
    probe.src = src;
  });
}

function dataUrlToBlob(dataUrl: string) {
  const [meta, data] = dataUrl.split(",");
  const mime = meta?.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  const bytes = atob(data ?? "");
  const arr = new Uint8Array(bytes.length);
  for (let idx = 0; idx < bytes.length; idx += 1) arr[idx] = bytes.charCodeAt(idx);
  return new Blob([arr], { type: mime });
}

export function DesignerClient(props: {
  id: string;
  initialName: string;
  initialDoc: DesignDoc;
  profileUrl: string;
  customFonts: CustomFont[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<unknown>(null);
  const layerRef = useRef<unknown>(null);
  const transformerRef = useRef<unknown>(null);
  const konvaRef = useRef<typeof import("konva").default | null>(null);
  const itemNodes = useRef<Map<string, unknown>>(new Map());

  const [doc, setDoc] = useState<DesignDoc>(() => ensureTemplate(props.initialDoc));
  const docRef = useRef<DesignDoc>(doc);
  const [side, setSide] = useState<Side>("front");
  const [name, setName] = useState(props.initialName);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const zoomRef = useRef(1);
  const [zoom, setZoom] = useState(1);
  const pinchRef = useRef<{ distance: number; zoom: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [addingQr, setAddingQr] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [pastDocs, setPastDocs] = useState<DesignDoc[]>([]);
  const [futureDocs, setFutureDocs] = useState<DesignDoc[]>([]);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [textDraft, setTextDraft] = useState("");

  const items = doc[side].items;
  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId],
  );
  const returnTo = useMemo(() => {
    const value = searchParams.get("return_to");
    if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
    return value;
  }, [searchParams]);

  useEffect(() => {
    void capture("card_designer_opened", { design_id: props.id });
  }, [props.id]);

  useEffect(() => {
    for (const font of props.customFonts) {
      if (!font.family || !font.url || !("FontFace" in window)) continue;
      const face = new FontFace(font.family, `url(${font.url})`);
      void face.load().then((loaded) => {
        document.fonts.add(loaded);
      }).catch(() => null);
    }
  }, [props.customFonts]);

  // Mutate the current side's items.
  function updateItems(updater: (items: DesignItem[]) => DesignItem[]) {
    const current = docRef.current;
    const next = { ...current, [side]: { items: updater(current[side].items) } };
    docRef.current = next;
    setPastDocs((history) => [...history.slice(-24), current]);
    setFutureDocs([]);
    setDirty(true);
    setDoc(next);
  }

  function replaceDoc(next: DesignDoc) {
    const current = docRef.current;
    docRef.current = next;
    setPastDocs((history) => [...history.slice(-24), current]);
    setFutureDocs([]);
    setSelectedId(null);
    setDirty(true);
    setDoc(next);
  }

  function setZoomLevel(nextZoom: number) {
    const bounded = Math.max(1, Math.min(2.5, nextZoom));
    zoomRef.current = bounded;
    setZoom(bounded);
    const stage = stageRef.current as
      | { width: (n: number) => void; height: (n: number) => void; scale: (s: { x: number; y: number }) => void; batchDraw: () => void }
      | null;
    const container = containerRef.current;
    if (!stage || !container) return;
    const parentWidth = container.parentElement?.clientWidth ?? container.clientWidth;
    if (!parentWidth) return;
    const base = parentWidth / CARD_W;
    const nextScale = base * bounded;
    stage.width(CARD_W * nextScale);
    stage.height(CARD_H * nextScale);
    stage.scale({ x: nextScale, y: nextScale });
    stage.batchDraw();
    setScale(nextScale);
  }

  function undo() {
    setPastDocs((history) => {
      const previous = history.at(-1);
      if (!previous) return history;
      setFutureDocs((future) => [docRef.current, ...future].slice(0, 25));
      docRef.current = previous;
      setDoc(previous);
      setSelectedId(null);
      setDirty(true);
      return history.slice(0, -1);
    });
  }

  function redo() {
    setFutureDocs((future) => {
      const next = future[0];
      if (!next) return future;
      setPastDocs((history) => [...history.slice(-24), docRef.current]);
      docRef.current = next;
      setDoc(next);
      setSelectedId(null);
      setDirty(true);
      return future.slice(1);
    });
  }

  useEffect(() => {
    docRef.current = doc;
  }, [doc]);

  useEffect(() => {
    function onBeforeUnload(event: BeforeUnloadEvent) {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const wantsHistory = event.metaKey || event.ctrlKey;
      if (!wantsHistory) return;
      if (event.key.toLowerCase() === "z" && event.shiftKey) {
        event.preventDefault();
        redo();
      } else if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
      } else if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!dirty || saving || uploadingImage || addingQr) return;
    const timer = window.setTimeout(() => {
      void save({ silent: true, preview: false });
    }, 2500);
    return () => window.clearTimeout(timer);
  }, [dirty, saving, uploadingImage, addingQr, doc, name]);

  // -- Initialise Konva stage on mount.
  useEffect(() => {
    let disposed = false;
    (async () => {
      const KonvaMod = await import("konva");
      if (disposed) return;
      const Konva = KonvaMod.default;
      konvaRef.current = Konva;

      const container = containerRef.current;
      if (!container) return;

      const initialWidth = container.clientWidth || 320;
      const initialScale = (initialWidth / CARD_W) * zoomRef.current;

      const stage = new Konva.Stage({
        container,
        width: CARD_W * initialScale,
        height: CARD_H * initialScale,
      });
      const layer = new Konva.Layer();
      stage.add(layer);
      const transformer = new Konva.Transformer({
        rotateEnabled: true,
        keepRatio: false,
        anchorSize: 14,
        borderStroke: "#c8a052",
        anchorStroke: "#c8a052",
        anchorFill: "#0a0a0a",
        anchorCornerRadius: 4,
      });
      layer.add(transformer);

      stage.scale({ x: initialScale, y: initialScale });

      stage.on("mousedown touchstart", (e) => {
        if (e.target === stage) {
          setSelectedId(null);
        }
      });

      stageRef.current = stage;
      layerRef.current = layer;
      transformerRef.current = transformer;
      setScale(initialScale);
    })();

    return () => {
      disposed = true;
      const stage = stageRef.current as { destroy?: () => void } | null;
      if (stage?.destroy) stage.destroy();
      stageRef.current = null;
      layerRef.current = null;
      transformerRef.current = null;
      itemNodes.current.clear();
    };
  }, []);

  // -- Keep stage scaled to container width (responsive).
  useEffect(() => {
    function onResize() {
      const stage = stageRef.current as
        | { width: (n: number) => void; height: (n: number) => void; scale: (s: { x: number; y: number }) => void; batchDraw: () => void }
        | null;
      const container = containerRef.current;
      if (!stage || !container) return;
      const w = container.parentElement?.clientWidth ?? container.clientWidth;
      if (!w) return;
      const s = (w / CARD_W) * zoomRef.current;
      stage.width(CARD_W * s);
      stage.height(CARD_H * s);
      stage.scale({ x: s, y: s });
      stage.batchDraw();
      setScale(s);
    }
    onResize();
    const ro = new ResizeObserver(onResize);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("orientationchange", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  // -- Reconcile Konva nodes whenever items / side change.
  useEffect(() => {
    const Konva = konvaRef.current;
    const layer = layerRef.current as
      | { add: (n: unknown) => void; batchDraw: () => void }
      | null;
    const transformer = transformerRef.current as
      | { nodes: (n: unknown[]) => void }
      | null;
    if (!Konva || !layer || !transformer) return;

    // Remove stale nodes.
    const presentIds = new Set(items.map((i) => i.id));
    for (const [id, node] of itemNodes.current.entries()) {
      if (!presentIds.has(id)) {
        (node as { destroy: () => void }).destroy();
        itemNodes.current.delete(id);
      }
    }

    // Add / update nodes.
    type KNode = {
      setAttrs: (a: Record<string, unknown>) => void;
      on: (e: string, h: (ev: unknown) => void) => void;
      getClassName: () => string;
      destroy: () => void;
    };

    for (const item of items) {
      const existing = itemNodes.current.get(item.id) as KNode | undefined;

      if (!existing) {
        let created: unknown;
        if (item.type === "text") {
          created = new Konva.Text({
            id: item.id,
            x: item.x,
            y: item.y,
            text: item.text,
            fill: item.fill,
            fontSize: item.fontSize,
            fontFamily: item.fontFamily,
            rotation: item.rotation ?? 0,
            width: item.width,
            draggable: true,
          });
        } else if (item.type === "rect") {
          created = new Konva.Rect({
            id: item.id,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            fill: item.fill,
            cornerRadius: item.cornerRadius ?? 0,
            rotation: item.rotation ?? 0,
            draggable: true,
          });
        } else if (item.type === "image") {
          const k = new Konva.Image({
            id: item.id,
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
            rotation: item.rotation ?? 0,
            draggable: true,
            image: undefined,
          });
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            k.image(img);
            (layer as unknown as { batchDraw: () => void }).batchDraw();
          };
          img.src = item.src;
          created = k;
        }

        if (!created) continue;
        const node = created as KNode;

        const localNode = node;
        localNode.on("click", () => setSelectedId(item.id));
        localNode.on("tap", () => setSelectedId(item.id));
        localNode.on("dblclick", () => {
          if (item.type === "text") {
            setEditingTextId(item.id);
            setTextDraft(item.text);
          }
        });
        localNode.on("dbltap", () => {
          if (item.type === "text") {
            setEditingTextId(item.id);
            setTextDraft(item.text);
          }
        });
        localNode.on("dragend", () => {
          const x = (localNode as unknown as { x(): number }).x();
          const y = (localNode as unknown as { y(): number }).y();
          updateItems((arr) =>
            arr.map((it) => {
              if (it.id !== item.id) return it;
              const snapped = snapItem(it, x, y);
              return { ...it, ...snapped };
            }),
          );
        });
        localNode.on("transformend", () => {
          const n = localNode as unknown as {
            x(): number;
            y(): number;
            rotation(): number;
            scaleX(): number;
            scaleY(): number;
            width(): number;
            height(): number;
            scaleX(v: number): void;
            scaleY(v: number): void;
            getClassName(): string;
            fontSize?: (v?: number) => number;
          };
          const sx = n.scaleX();
          const sy = n.scaleY();
          n.scaleX(1);
          n.scaleY(1);

          updateItems((arr) =>
            arr.map((it) => {
              if (it.id !== item.id) return it;
              const base = {
                ...it,
                ...snapItem(it, n.x(), n.y()),
                rotation: n.rotation(),
              };
              if (it.type === "text") {
                return {
                  ...(base as DesignItem & { type: "text" }),
                  fontSize: Math.max(8, Math.round(it.fontSize * sy)),
                  width: it.width ? Math.max(20, it.width * sx) : undefined,
                };
              }
              if (it.type === "rect" || it.type === "image") {
                return {
                  ...(base as DesignItem & { type: "rect" | "image" }),
                  width: Math.max(4, it.width * sx),
                  height: Math.max(4, it.height * sy),
                };
              }
              return it;
            }),
          );
        });

        layer.add(localNode);
        itemNodes.current.set(item.id, localNode);
      } else {
        const attrs: Record<string, unknown> = {
          x: item.x,
          y: item.y,
          rotation: item.rotation ?? 0,
        };
        if (item.type === "text") {
          attrs.text = item.text;
          attrs.fill = item.fill;
          attrs.fontSize = item.fontSize;
          attrs.fontFamily = item.fontFamily;
          if (item.width) attrs.width = item.width;
        } else if (item.type === "rect") {
          attrs.width = item.width;
          attrs.height = item.height;
          attrs.fill = item.fill;
          attrs.cornerRadius = item.cornerRadius ?? 0;
        } else if (item.type === "image") {
          attrs.width = item.width;
          attrs.height = item.height;
        }
        existing.setAttrs(attrs);
      }
    }

    // Update transformer selection.
    const selectedNode = selectedId ? itemNodes.current.get(selectedId) : null;
    transformer.nodes(selectedNode ? [selectedNode] : []);
    layer.batchDraw();
  }, [items, side, selectedId]);

  // -- Tool actions
  function addText() {
    const id = makeId();
    updateItems((arr) => [
      ...arr,
      {
        type: "text",
        id,
        x: CARD_W / 2 - 120,
        y: CARD_H / 2 - 24,
        text: "Edit me",
        fill: "#f5e7c4",
        fontSize: 48,
        fontFamily: "sans-serif",
      },
    ]);
    setSelectedId(id);
    void capture("card_design_item_added", { design_id: props.id, type: "text" });
  }

  function addRect() {
    const id = makeId();
    updateItems((arr) => [
      ...arr,
      {
        type: "rect",
        id,
        x: CARD_W / 2 - 100,
        y: CARD_H / 2 - 60,
        width: 200,
        height: 120,
        fill: "#c8a052",
        cornerRadius: 12,
      },
    ]);
    setSelectedId(id);
    void capture("card_design_item_added", { design_id: props.id, type: "rect" });
  }

  function applyTemplate(templateId: string) {
    const template = TEMPLATES.find((candidate) => candidate.id === templateId);
    if (!template) return;
    replaceDoc({
      w: CARD_W,
      h: CARD_H,
      front: { items: cloneItems(template.front) },
      back: { items: cloneItems(template.back) },
    });
    void capture("card_design_template_applied", { design_id: props.id, template: template.id });
  }

  async function onAddImage(file: File) {
    if (!file.type.startsWith("image/")) return;
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large. Max 5 MB.");
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    setUploadingImage(true);
    try {
      const dimensions = await imageDimensions(objectUrl);
      const uploadedUrl = await uploadDesignerAsset({
        body: file,
        filename: file.name,
        mime: file.type || "image/png",
        width: dimensions.width,
        height: dimensions.height,
      });
      const maxW = CARD_W * 0.6;
      const ratio = dimensions.width / dimensions.height;
      const w = Math.min(maxW, dimensions.width);
      const h = w / ratio;
      const id = makeId();
      updateItems((arr) => [
        ...arr,
        {
          type: "image",
          id,
          x: CARD_W / 2 - w / 2,
          y: CARD_H / 2 - h / 2,
          width: w,
          height: h,
          src: uploadedUrl,
        },
      ]);
      setSelectedId(id);
      void capture("card_design_item_added", { design_id: props.id, type: "image" });
    } catch (error) {
      alert((error as Error).message);
    } finally {
      URL.revokeObjectURL(objectUrl);
      setUploadingImage(false);
    }
  }

  async function addQr() {
    setAddingQr(true);
    try {
      const QRCode = await import("qrcode");
      const qrDataUrl = await QRCode.toDataURL(props.profileUrl, {
        errorCorrectionLevel: "H",
        margin: 1,
        width: 600,
        color: { dark: "#0a0a0a", light: "#f5e7c4" },
      });
      const qrBlob = dataUrlToBlob(qrDataUrl);
      const uploadedUrl = await uploadDesignerAsset({
        body: qrBlob,
        filename: `${props.id}-profile-qr.png`,
        mime: "image/png",
        width: 600,
        height: 600,
      });
      const id = makeId();
      const size = 180;
      updateItems((arr) => [
        ...arr,
        {
          type: "image",
          id,
          x: CARD_W - size - 64,
          y: CARD_H - size - 64,
          width: size,
          height: size,
          src: uploadedUrl,
        },
      ]);
      setSelectedId(id);
      void capture("card_design_item_added", { design_id: props.id, type: "qr" });
    } catch (error) {
      alert((error as Error).message);
    } finally {
      setAddingQr(false);
    }
  }

  function deleteSelected() {
    if (!selectedId) return;
    updateItems((arr) => arr.filter((i) => i.id !== selectedId));
    setSelectedId(null);
  }

  function moveSelected(dir: "up" | "down") {
    if (!selectedId) return;
    updateItems((arr) => {
      const idx = arr.findIndex((i) => i.id === selectedId);
      if (idx < 0) return arr;
      const next = [...arr];
      const swap = dir === "up" ? idx + 1 : idx - 1;
      if (swap < 0 || swap >= next.length) return next;
      [next[idx], next[swap]] = [next[swap], next[idx]];
      return next;
    });
  }

  function setSelectedFill(color: string) {
    if (!selectedId) return;
    updateItems((arr) =>
      arr.map((i) =>
        i.id === selectedId && (i.type === "text" || i.type === "rect")
          ? { ...i, fill: color }
          : i,
      ),
    );
  }

  function setSelectedFont(fontFamily: string) {
    if (!selectedId) return;
    updateItems((arr) =>
      arr.map((i) =>
        i.id === selectedId && i.type === "text" ? { ...i, fontFamily } : i,
      ),
    );
  }

  function changeFontSize(delta: number) {
    if (!selectedId) return;
    updateItems((arr) =>
      arr.map((i) =>
        i.id === selectedId && i.type === "text"
          ? { ...i, fontSize: Math.max(8, Math.min(240, i.fontSize + delta)) }
          : i,
      ),
    );
  }

  function commitTextEdit() {
    if (!editingTextId) return;
    const value = textDraft;
    updateItems((arr) =>
      arr.map((i) => (i.id === editingTextId && i.type === "text" ? { ...i, text: value } : i)),
    );
    setEditingTextId(null);
    setTextDraft("");
  }

  // -- Save (incl. preview).
  async function save(opts?: { silent?: boolean; preview?: boolean }): Promise<boolean> {
    setSaving(true);
    try {
      // Generate front preview at constrained size.
      let preview: string | undefined;
      const stage = stageRef.current as
        | { toDataURL: (cfg: { pixelRatio?: number; mimeType?: string; quality?: number }) => string }
        | null;
      if (stage && side === "front" && opts?.preview !== false) {
        try {
          // 320px wide preview ⇒ pixelRatio = 320 / (CARD_W * scale)
          const target = 320 / (CARD_W * scale);
          const previewDataUrl = stage.toDataURL({ pixelRatio: target, mimeType: "image/jpeg", quality: 0.8 });
          const previewBlob = dataUrlToBlob(previewDataUrl);
          preview = await uploadDesignerAsset({
            body: previewBlob,
            filename: `${props.id}-preview.jpg`,
            mime: "image/jpeg",
            width: 320,
            height: Math.round(320 / ASPECT),
          });
        } catch {
          preview = undefined;
        }
      }
      const result = await saveDesignAction({
        id: props.id,
        name,
        doc: JSON.stringify(doc),
        preview,
      });
      if (result.ok) {
        setSavedAt(new Date());
        setDirty(false);
        void capture("card_design_saved", { design_id: props.id, preview: opts?.preview !== false });
        if (!opts?.silent) router.refresh();
        return true;
      } else {
        alert(`Save failed: ${result.error}`);
        return false;
      }
    } finally {
      setSaving(false);
    }
  }

  async function orderCustomCard() {
    const saved = await save({ silent: true });
    if (saved) {
      void capture("card_design_order_started", { design_id: props.id });
      const next = new URL(returnTo ?? "/shop/card-custom", window.location.origin);
      next.searchParams.set("design_id", props.id);
      router.push(`${next.pathname}${next.search}${next.hash}`);
    }
  }

  // -- Export PNG (hi-res).
  function exportPng() {
    const stage = stageRef.current as
      | { toDataURL: (cfg: { pixelRatio?: number; mimeType?: string }) => string }
      | null;
    if (!stage) return;
    // Hi-res: aim for ~1011 logical px wide -> 1× ⇒ already 300 DPI.
    const url = stage.toDataURL({ pixelRatio: 1 / scale, mimeType: "image/png" });
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(name || "card").replace(/[^a-z0-9-]+/gi, "_")}-${side}.png`;
    a.click();
    void capture("card_design_exported", { design_id: props.id, side });
  }

  function touchDistance(touches: React.TouchList) {
    const a = touches.item(0);
    const b = touches.item(1);
    if (!a || !b) return 0;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  return (
    <div className="space-y-3" data-testid="card-designer">
      <div className="flex items-center gap-2">
        <input
          aria-label="Design name"
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            setDirty(true);
          }}
          data-testid="design-name"
          className="min-w-0 flex-1 rounded-md border border-onyx-700 bg-onyx-900 px-3 py-2 text-sm text-ivory focus:border-gold focus:outline-none"
          maxLength={120}
        />
        <button
          type="button"
          onClick={() => save()}
          disabled={saving}
          data-testid="design-save"
          className="rounded-md border border-gold/60 bg-gold px-3 py-2 text-sm font-medium text-onyx-950 disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save"}
        </button>
        <button
          type="button"
          onClick={orderCustomCard}
          disabled={saving || uploadingImage || addingQr}
          data-testid="design-order"
          className="rounded-md border border-gold/50 px-3 py-2 text-sm font-medium text-gold disabled:opacity-50"
        >
          Order
        </button>
      </div>

      {/* Side switcher */}
      <div
        role="tablist"
        aria-label="Card side"
        className="inline-flex rounded-md border border-onyx-700 bg-onyx-900 p-0.5 text-xs uppercase tracking-widest"
      >
        {(["front", "back"] as const).map((s) => (
          <button
            key={s}
            type="button"
            role="tab"
            aria-selected={side === s}
            data-testid={`design-side-${s}`}
            onClick={() => {
              setSelectedId(null);
              setSide(s);
            }}
            className={
              "rounded px-3 py-1.5 transition " +
              (side === s ? "bg-gold text-onyx-950" : "text-ivory-dim hover:text-ivory")
            }
          >
            {s}
          </button>
        ))}
      </div>

      {/* Stage */}
      <div className="rounded-lg border border-onyx-700 bg-onyx-950 p-2">
        <div
          data-testid="design-stage"
          className="relative mx-auto w-full overflow-auto rounded-md bg-black [-webkit-overflow-scrolling:touch]"
          style={{ aspectRatio: String(ASPECT) }}
          onTouchStart={(event) => {
            if (event.touches.length !== 2) return;
            pinchRef.current = { distance: touchDistance(event.touches), zoom: zoomRef.current };
          }}
          onTouchMove={(event) => {
            if (event.touches.length !== 2 || !pinchRef.current) return;
            event.preventDefault();
            const distance = touchDistance(event.touches);
            if (!distance || !pinchRef.current.distance) return;
            setZoomLevel(pinchRef.current.zoom * (distance / pinchRef.current.distance));
          }}
          onTouchEnd={() => {
            pinchRef.current = null;
          }}
        >
          <div ref={containerRef} className="absolute inset-0" />
          <div className="pointer-events-none absolute inset-[3%] z-10 rounded-sm border border-dashed border-red-300/60" />
          <div className="pointer-events-none absolute inset-[8%] z-10 rounded-sm border border-dashed border-gold/60" />
          {side === "back" && (
            <div className="pointer-events-none absolute right-[12%] top-[16%] z-10 h-[23%] rounded-full border border-dashed border-ivory/50" style={{ aspectRatio: "1 / 1" }} />
          )}
        </div>
      </div>

      {/* Tools — horizontal scrollable on mobile */}
      <div className="flex gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
        <ToolPill onClick={undo} testid="tool-undo" label="↶" title="Undo" disabled={pastDocs.length === 0} />
        <ToolPill onClick={redo} testid="tool-redo" label="↷" title="Redo" disabled={futureDocs.length === 0} />
        <label className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-onyx-700 bg-onyx-900 px-3 py-1.5 text-xs text-ivory-dim hover:border-gold/40 hover:text-ivory">
          Template
          <select
            data-testid="tool-template"
            className="bg-transparent text-ivory outline-none"
            defaultValue=""
            onChange={(event) => {
              applyTemplate(event.target.value);
              event.target.value = "";
            }}
          >
            <option value="" disabled>Choose</option>
            {TEMPLATES.map((template) => (
              <option key={template.id} value={template.id}>{template.name}</option>
            ))}
          </select>
        </label>
        <ToolPill onClick={addText} testid="tool-text" label="+ Text" />
        <ToolPill onClick={addRect} testid="tool-rect" label="+ Shape" />
        <ToolPill onClick={() => void addQr()} testid="tool-qr" label={addingQr ? "Adding…" : "+ QR"} disabled={addingQr} />
        <label
          className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-onyx-700 bg-onyx-900 px-3 py-1.5 text-xs text-ivory-dim hover:border-gold/40 hover:text-ivory"
          data-testid="tool-image"
        >
          {uploadingImage ? "Uploading…" : "+ Image"}
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onAddImage(f);
              e.target.value = "";
            }}
          />
        </label>
        <ToolPill onClick={exportPng} testid="tool-export" label="↓ PNG" />
        <ToolPill onClick={() => setZoomLevel(zoom - 0.25)} testid="tool-zoom-out" label="−" title="Zoom out" disabled={zoom <= 1} />
        <ToolPill onClick={() => setZoomLevel(zoom + 0.25)} testid="tool-zoom-in" label="+" title="Zoom in" disabled={zoom >= 2.5} />
      </div>

      {/* Inspector — bottom sheet on mobile */}
      {selected && (
        <div
          data-testid="design-inspector"
          className="safe-sticky-bottom sticky z-10 rounded-lg border border-gold/40 bg-onyx-900/95 p-3 shadow-lg backdrop-blur"
        >
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs uppercase tracking-widest text-gold">
              {selected.type}
            </span>
            <div className="flex items-center gap-1">
              <IconBtn label="Back" onClick={() => moveSelected("down")} testid="ins-back">↧</IconBtn>
              <IconBtn label="Forward" onClick={() => moveSelected("up")} testid="ins-forward">↥</IconBtn>
              <IconBtn label="Delete" onClick={deleteSelected} testid="ins-delete" danger>✕</IconBtn>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-2">
            {(selected.type === "text" || selected.type === "rect") && (
              <label className="inline-flex items-center gap-2 text-xs text-ivory-dim">
                Color
                <input
                  type="color"
                  data-testid="ins-color"
                  value={"fill" in selected ? selected.fill : "#000000"}
                  onChange={(e) => setSelectedFill(e.target.value)}
                  className="h-7 w-9 cursor-pointer rounded border border-onyx-700 bg-transparent"
                />
              </label>
            )}
            {selected.type === "text" && (
              <div className="inline-flex items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={() => changeFontSize(-4)}
                  className="rounded border border-onyx-700 px-2 py-1 text-ivory-dim hover:text-ivory"
                  data-testid="ins-font-down"
                >
                  A−
                </button>
                <span className="px-1 text-ivory-mute">{selected.fontSize}px</span>
                <button
                  type="button"
                  onClick={() => changeFontSize(4)}
                  className="rounded border border-onyx-700 px-2 py-1 text-ivory-dim hover:text-ivory"
                  data-testid="ins-font-up"
                >
                  A+
                </button>
              </div>
            )}
            {selected.type === "text" && (
              <label className="inline-flex items-center gap-2 text-xs text-ivory-dim">
                Font
                <select
                  data-testid="ins-font-family"
                  value={selected.fontFamily}
                  onChange={(event) => setSelectedFont(event.target.value)}
                  className="rounded border border-onyx-700 bg-onyx-950 px-2 py-1 text-xs text-ivory"
                >
                  <option value="sans-serif">Sans</option>
                  <option value="serif">Serif</option>
                  <option value="monospace">Mono</option>
                  {props.customFonts.map((font) => (
                    <option key={`${font.family}-${font.url}`} value={font.family}>{font.family}</option>
                  ))}
                </select>
              </label>
            )}
            {selected.type === "text" && (
              <button
                type="button"
                onClick={() => {
                  setEditingTextId(selected.id);
                  setTextDraft(selected.text);
                }}
                className="rounded border border-onyx-700 px-2 py-1 text-xs text-ivory-dim hover:text-ivory"
                data-testid="ins-edit-text"
              >
                Edit text
              </button>
            )}
          </div>
        </div>
      )}

      {/* Text edit modal */}
      {editingTextId && (
        <div
          className="safe-modal-frame fixed inset-0 z-40 flex items-end justify-center bg-black/60 sm:items-center"
          role="dialog"
          aria-label="Edit text"
        >
          <div className="safe-max-h-screen w-full max-w-md overflow-y-auto rounded-lg border border-gold/40 bg-onyx-900 p-4">
            <label className="block text-xs uppercase tracking-widest text-gold">
              Text
            </label>
            <textarea
              autoFocus
              value={textDraft}
              onChange={(e) => setTextDraft(e.target.value)}
              data-testid="ins-text-input"
              className="mt-2 h-28 w-full resize-none rounded-md border border-onyx-700 bg-onyx-950 p-2 text-sm text-ivory focus:border-gold focus:outline-none"
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setEditingTextId(null);
                  setTextDraft("");
                }}
                className="rounded-md border border-onyx-700 px-3 py-1.5 text-sm text-ivory-dim"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitTextEdit}
                data-testid="ins-text-commit"
                className="rounded-md border border-gold/60 bg-gold px-3 py-1.5 text-sm font-medium text-onyx-950"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="text-[11px] text-ivory-mute" data-testid="design-status">
        {saving ? "Saving…" : dirty ? "Unsaved changes" : savedAt ? `Saved ${savedAt.toLocaleTimeString()}` : "Saved draft"}
      </p>
    </div>
  );
}

function ToolPill(props: { onClick: () => void; label: string; testid: string; title?: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={props.onClick}
      disabled={props.disabled}
      title={props.title}
      aria-label={props.title ?? props.label}
      data-testid={props.testid}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-onyx-700 bg-onyx-900 px-3 py-1.5 text-xs text-ivory-dim hover:border-gold/40 hover:text-ivory disabled:cursor-not-allowed disabled:opacity-40"
    >
      {props.label}
    </button>
  );
}

function IconBtn(props: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
  testid: string;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      aria-label={props.label}
      title={props.label}
      onClick={props.onClick}
      data-testid={props.testid}
      className={
        "inline-flex h-8 w-8 items-center justify-center rounded border text-sm " +
        (props.danger
          ? "border-red-500/40 text-red-400 hover:bg-red-500/10"
          : "border-onyx-700 text-ivory-dim hover:text-ivory")
      }
    >
      {props.children}
    </button>
  );
}
