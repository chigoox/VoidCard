"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";

export type MediaItem = {
  id: string;
  kind: "image" | "video" | "file";
  mime: string | null;
  url: string;
  sizeBytes?: number;
  source?: "upload" | "ai";
  prompt?: string | null;
  createdAt: string;
};

type Props = {
  open: boolean;
  kind: "image" | "video";
  /** Called when user picks an asset; modal closes after pick. */
  onSelect: (asset: MediaItem) => void;
  /** Called when modal should close. */
  onClose: () => void;
  /** Bubble new assets (uploads/AI generations) up to the editor library. */
  onAssetAdded?: (asset: MediaItem) => void;
  /** AI tab is only useful for images. Hidden for video. */
  enableAi?: boolean;
};

const SIZES = [
  { value: "1024x1024", label: "Square 1024×1024" },
  { value: "1024x1792", label: "Portrait 1024×1792" },
  { value: "1792x1024", label: "Landscape 1792×1024" },
] as const;

export function MediaManagerModal({ open, kind, onSelect, onClose, onAssetAdded, enableAi = true }: Props) {
  const [tab, setTab] = useState<"library" | "ai">("library");
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"all" | "upload" | "ai">("all");
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  // AI tab state
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<(typeof SIZES)[number]["value"]>("1024x1024");
  const [credits, setCredits] = useState<number | null>(null);
  const [costPerImage, setCostPerImage] = useState(1);
  const [aiBusy, startAi] = useTransition();
  const [aiError, setAiError] = useState<string | null>(null);

  const showAi = enableAi && kind === "image";

  const fetchPage = useCallback(
    async (reset = false) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("kind", kind);
        if (sourceFilter !== "all") params.set("source", sourceFilter);
        if (search.trim()) params.set("q", search.trim());
        params.set("limit", "30");
        if (!reset && cursor) params.set("cursor", cursor);
        const res = await fetch(`/api/media/list?${params.toString()}`, { cache: "no-store" });
        const json = (await res.json()) as { ok?: boolean; items?: MediaItem[]; nextCursor?: string | null };
        if (!res.ok || !json.ok) {
          setError("Could not load media.");
          return;
        }
        const list = json.items ?? [];
        setItems((current) => (reset ? list : [...current, ...list]));
        setCursor(json.nextCursor ?? null);
        setHasMore(Boolean(json.nextCursor));
      } catch {
        setError("Could not load media.");
      } finally {
        setLoading(false);
      }
    },
    [kind, sourceFilter, search, cursor],
  );

  // Reset + fetch on open / filter change.
  useEffect(() => {
    if (!open) return;
    setItems([]);
    setCursor(null);
    setHasMore(false);
    void fetchPage(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, kind, sourceFilter]);

  // Debounced search.
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => {
      setItems([]);
      setCursor(null);
      void fetchPage(true);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  // Load credit balance when AI tab opens.
  useEffect(() => {
    if (!open || !showAi) return;
    let cancelled = false;
    fetch("/api/credits", { cache: "no-store" })
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        if (j?.ok) {
          setCredits(typeof j.balance === "number" ? j.balance : 0);
          setCostPerImage(typeof j.costPerImage === "number" ? j.costPerImage : 1);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open, showAi]);

  // Esc to close.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  function handleGenerate() {
    if (!prompt.trim() || aiBusy) return;
    setAiError(null);
    startAi(async () => {
      try {
        const res = await fetch("/api/media/ai-generate", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt: prompt.trim(), size }),
        });
        const json = await res.json();
        if (!res.ok || !json.ok) {
          if (json.error === "insufficient") {
            setAiError("Out of credits. Buy more from the Credits tab.");
          } else if (json.error === "ai_disabled") {
            setAiError("AI generation is not configured on this server.");
          } else if (json.error === "rate_limited") {
            setAiError("You're going too fast — try again in a minute.");
          } else if (json.error === "storage_quota_exceeded") {
            setAiError("Storage quota exceeded.");
          } else {
            setAiError(json.detail || "Generation failed. Try a different prompt.");
          }
          return;
        }
        const asset: MediaItem = json.media;
        if (typeof json.creditsRemaining === "number") setCredits(json.creditsRemaining);
        setItems((prev) => [asset, ...prev]);
        onAssetAdded?.(asset);
        onSelect(asset);
      } catch {
        setAiError("Network error. Try again.");
      }
    });
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this asset? It will be removed from your library.")) return;
    const prior = items;
    setItems((cur) => cur.filter((it) => it.id !== id));
    try {
      const res = await fetch("/api/media/list", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) setItems(prior);
    } catch {
      setItems(prior);
    }
  }

  if (!open) return null;
  if (typeof document === "undefined") return null;

  return <>{createPortal((
    <div
      className="safe-modal-sheet fixed inset-0 z-50 flex items-end justify-center bg-black/70 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Media library"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      data-testid="media-manager-modal"
    >
      <div className="card safe-max-h-screen flex w-full flex-col gap-3 overflow-hidden rounded-t-card border border-onyx-700 bg-onyx-950 p-4 sm:max-w-3xl sm:rounded-card">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-base font-medium text-ivory">
            {kind === "image" ? "Image library" : "Video library"}
          </h2>
          <button type="button" className="btn-ghost px-2 py-1 text-sm" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        {showAi ? (
          <div className="flex gap-1 rounded-pill border border-onyx-800 bg-onyx-950/80 p-1 text-xs">
            <button
              type="button"
              className={`flex-1 rounded-pill px-3 py-1.5 transition ${tab === "library" ? "bg-gold/20 text-gold" : "text-ivory-mute"}`}
              onClick={() => setTab("library")}
              data-testid="media-tab-library"
            >
              Library
            </button>
            <button
              type="button"
              className={`flex-1 rounded-pill px-3 py-1.5 transition ${tab === "ai" ? "bg-gold/20 text-gold" : "text-ivory-mute"}`}
              onClick={() => setTab("ai")}
              data-testid="media-tab-ai"
            >
              ✨ Generate with AI
            </button>
          </div>
        ) : null}

        {tab === "library" ? (
          <>
            <div className="flex flex-wrap gap-2">
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search prompts (AI images)"
                className="min-w-0 flex-1 rounded-card border border-onyx-700 bg-onyx-950 px-3 py-2 text-sm text-ivory outline-none focus:border-gold/60"
                data-testid="media-search"
              />
              <select
                value={sourceFilter}
                onChange={(e) => setSourceFilter(e.target.value as typeof sourceFilter)}
                className="rounded-card border border-onyx-700 bg-onyx-950 px-3 py-2 text-sm text-ivory"
              >
                <option value="all">All sources</option>
                <option value="upload">Uploaded</option>
                <option value="ai">AI-generated</option>
              </select>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <div key={item.id} className="group relative overflow-hidden rounded-card border border-onyx-800 bg-onyx-950">
                  <button
                    type="button"
                    onClick={() => onSelect(item)}
                    className="block w-full"
                    title={item.prompt || ""}
                    data-testid={`media-item-${item.id}`}
                  >
                    {item.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.url} alt={item.prompt ?? ""} className="aspect-square w-full object-cover" loading="lazy" />
                    ) : (
                      <video src={item.url} className="aspect-square w-full object-cover" muted />
                    )}
                  </button>
                  {item.source === "ai" ? (
                    <span className="absolute left-1 top-1 rounded-pill bg-black/70 px-1.5 py-0.5 text-[10px] uppercase tracking-widest text-gold">
                      AI
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    className="absolute right-1 top-1 rounded-pill bg-black/70 px-1.5 py-0.5 text-[10px] text-ivory opacity-0 transition group-hover:opacity-100"
                    aria-label="Delete asset"
                  >
                    ×
                  </button>
                </div>
              ))}
              {!loading && items.length === 0 ? (
                <p className="col-span-full py-8 text-center text-sm text-ivory-mute">
                  Your library is empty. Upload an image or generate one with AI.
                </p>
              ) : null}
            </div>
            {error ? <p className="text-xs text-red-300">{error}</p> : null}
            <div className="flex items-center justify-between text-xs text-ivory-mute">
              <span>{items.length} item{items.length === 1 ? "" : "s"}</span>
              {hasMore ? (
                <button
                  type="button"
                  className="btn-ghost px-3 py-1.5"
                  onClick={() => fetchPage(false)}
                  disabled={loading}
                  data-testid="media-load-more"
                >
                  {loading ? "Loading…" : "Load more"}
                </button>
              ) : null}
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between rounded-card border border-onyx-800 bg-onyx-950/60 px-3 py-2 text-xs">
              <span className="text-ivory-mute">
                Credits:{" "}
                <strong className="text-gold">{credits ?? "…"}</strong>{" "}
                <span className="opacity-70">({costPerImage}/image)</span>
              </span>
              <a href="/account/credits" className="text-gold underline-offset-2 hover:underline">
                Buy credits →
              </a>
            </div>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="A minimal abstract gold gradient on charcoal, soft grain, square…"
              maxLength={800}
              rows={4}
              className="w-full resize-y rounded-card border border-onyx-700 bg-onyx-950 px-3 py-2 text-sm text-ivory outline-none focus:border-gold/60"
              data-testid="ai-prompt"
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={size}
                onChange={(e) => setSize(e.target.value as typeof size)}
                className="rounded-card border border-onyx-700 bg-onyx-950 px-3 py-2 text-sm text-ivory"
              >
                {SIZES.map((s) => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
              <button
                type="button"
                className="btn-primary rounded-card px-4 py-2 text-sm"
                onClick={handleGenerate}
                disabled={aiBusy || !prompt.trim() || (credits !== null && credits < costPerImage)}
                data-testid="ai-generate"
              >
                {aiBusy ? "Generating…" : `Generate (−${costPerImage} credit${costPerImage === 1 ? "" : "s"})`}
              </button>
            </div>
            {aiError ? <p className="text-xs text-red-300">{aiError}</p> : null}
            <p className="text-[11px] text-ivory-mute">
              Generated images are saved to your library and count against your storage quota. Be specific for best results.
            </p>
          </div>
        )}
      </div>
    </div>
  ), document.body)}</>;
}
