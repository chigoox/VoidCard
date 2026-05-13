"use client";

import dynamic from "next/dynamic";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, FolderOpen, Star, Upload, X } from "lucide-react";
import { uploadMediaAsset } from "./upload-media-asset";

const MediaManagerModal = dynamic(() => import("@/app/(app)/edit/MediaManagerModal").then((m) => m.MediaManagerModal), {
  ssr: false,
});

const MAX_PRODUCT_IMAGES = 12;
const INPUT_CLASS_NAME =
  "w-full rounded-card border border-onyx-700 bg-onyx-950 px-3 py-2.5 text-sm text-ivory outline-none transition focus:border-gold/60";
const TEXTAREA_CLASS_NAME = `${INPUT_CLASS_NAME} min-h-[88px] resize-y`;

type Props = {
  initialImages?: string[];
  label?: string;
  maxImages?: number;
  primaryFieldName?: string;
  imagesFieldName?: string;
};

function normalizeImages(images: string[]): string[] {
  const seen = new Set<string>();
  const normalized: string[] = [];
  for (const image of images) {
    const url = image.trim();
    if (!/^https?:\/\//i.test(url) || seen.has(url)) continue;
    seen.add(url);
    normalized.push(url);
  }
  return normalized.slice(0, MAX_PRODUCT_IMAGES);
}

function extractImageUrls(value: string) {
  return value
    .split(/[\n,]+/)
    .map((entry) => entry.trim())
    .filter((entry) => /^https?:\/\//i.test(entry));
}

export function ProductImagesField({
  initialImages = [],
  label = "Product images",
  maxImages = MAX_PRODUCT_IMAGES,
  primaryFieldName = "image_url",
  imagesFieldName = "image_urls_json",
}: Props) {
  const [images, setImages] = useState(() => normalizeImages(initialImages).slice(0, maxImages));
  const [modalOpen, setModalOpen] = useState(false);
  const [urlList, setUrlList] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [uploading, startUpload] = useTransition();
  const remaining = Math.max(0, maxImages - images.length);

  function appendImages(nextImages: string[], source: string) {
    const merged = normalizeImages([...images, ...nextImages]).slice(0, maxImages);
    const added = merged.length - images.length;
    const clipped = nextImages.length - added;
    setImages(merged);
    setMessage(
      added > 0
        ? `${added} ${source} added${clipped > 0 ? `; ${clipped} skipped` : ""}.`
        : `No new ${source} added.`,
    );
  }

  function handleFilesChange(event: React.ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []).filter((file) => file.type.startsWith("image/"));
    input.value = "";
    if (files.length === 0) return;
    if (remaining <= 0) {
      setMessage(`Image gallery is full (${maxImages} images).`);
      return;
    }

    const selected = files.slice(0, remaining);
    const clipped = files.length - selected.length;
    setMessage(null);
    startUpload(async () => {
      const uploaded = await Promise.all(
        selected.map(async (file) => {
          try {
            const asset = await uploadMediaAsset(file, "image");
            return { url: asset.url, error: null };
          } catch (error) {
            return { url: null, error: error instanceof Error ? error.message : "Upload failed. Try again." };
          }
        }),
      );
      const urls = uploaded
        .map((result) => result.url)
        .filter((url): url is string => typeof url === "string");
      const failures = uploaded.length - urls.length;
      appendImages(urls, "upload");
      if (failures > 0 || clipped > 0) {
        setMessage(
          [
            urls.length > 0 ? `${urls.length} uploaded` : null,
            failures > 0 ? `${failures} failed` : null,
            clipped > 0 ? `${clipped} skipped` : null,
          ]
            .filter(Boolean)
            .join("; "),
        );
      }
    });
  }

  function addUrls() {
    const urls = extractImageUrls(urlList);
    if (urls.length === 0) {
      setMessage("Paste one or more image URLs that start with http:// or https://.");
      return;
    }
    appendImages(urls, "URL");
    setUrlList("");
  }

  function removeImage(index: number) {
    setImages((current) => current.filter((_, currentIndex) => currentIndex !== index));
  }

  function moveImage(index: number, direction: -1 | 1) {
    setImages((current) => {
      const target = index + direction;
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const [image] = next.splice(index, 1);
      next.splice(target, 0, image);
      return next;
    });
  }

  function makePrimary(index: number) {
    setImages((current) => {
      if (index <= 0 || index >= current.length) return current;
      const next = [...current];
      const [image] = next.splice(index, 1);
      return [image, ...next];
    });
  }

  return (
    <div className="space-y-3 rounded-card border border-onyx-800 bg-onyx-950/40 p-3">
      <input type="hidden" name={primaryFieldName} value={images[0] ?? ""} />
      <input type="hidden" name={imagesFieldName} value={JSON.stringify(images)} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">{label}</span>
        <span className="text-xs text-ivory-mute">{images.length}/{maxImages}</span>
      </div>

      {images.length > 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3" data-testid="product-image-grid">
          {images.map((image, index) => (
            <div key={`${image}-${index}`} className="overflow-hidden rounded-card border border-onyx-800 bg-onyx-950">
              <div className="relative aspect-square bg-onyx-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" />
                {index === 0 ? (
                  <span className="absolute left-2 top-2 rounded-pill bg-gold px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-onyx-950">
                    Primary
                  </span>
                ) : null}
              </div>
              <div className="flex items-center justify-between gap-1 border-t border-onyx-800 p-1.5">
                <button type="button" className="btn-ghost p-2" onClick={() => makePrimary(index)} disabled={index === 0} aria-label="Make primary image">
                  <Star className="size-4" aria-hidden />
                </button>
                <button type="button" className="btn-ghost p-2" onClick={() => moveImage(index, -1)} disabled={index === 0} aria-label="Move image left">
                  <ArrowLeft className="size-4" aria-hidden />
                </button>
                <button type="button" className="btn-ghost p-2" onClick={() => moveImage(index, 1)} disabled={index === images.length - 1} aria-label="Move image right">
                  <ArrowRight className="size-4" aria-hidden />
                </button>
                <button type="button" className="btn-ghost p-2 text-red-300" onClick={() => removeImage(index)} aria-label="Remove image">
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <label className="btn-ghost inline-flex cursor-pointer items-center gap-1.5 p-2.5 text-xs sm:px-3 sm:py-2" aria-disabled={uploading || remaining <= 0} aria-label={uploading ? "Uploading product images" : "Upload product images"}>
          <Upload className="size-4" aria-hidden />
          <span>{uploading ? "Uploading..." : "Upload images"}</span>
          <input type="file" accept="image/*" multiple className="hidden" onChange={handleFilesChange} disabled={uploading || remaining <= 0} data-testid="product-upload-images" />
        </label>
        <button
          type="button"
          className="btn-ghost inline-flex items-center gap-1.5 p-2.5 text-xs sm:px-3 sm:py-2"
          onClick={() => setModalOpen(true)}
          disabled={remaining <= 0}
          data-testid="product-browse-library"
        >
          <FolderOpen className="size-4" aria-hidden />
          <span>Browse library</span>
        </button>
      </div>

      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Image URLs</span>
          <textarea
            className={TEXTAREA_CLASS_NAME}
            value={urlList}
            onChange={(event) => setUrlList(event.target.value)}
            placeholder="https://example.com/photo-1.jpg&#10;https://example.com/photo-2.jpg"
            data-testid="product-image-url-list"
          />
        </label>
        <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={addUrls} disabled={remaining <= 0} data-testid="product-add-url-list">
          Add URLs
        </button>
      </div>

      {message ? <p className="text-xs text-ivory-mute" data-testid="product-images-message">{message}</p> : null}

      <MediaManagerModal
        open={modalOpen}
        kind="image"
        onClose={() => setModalOpen(false)}
        onSelect={(asset) => appendImages([asset.url], "library image")}
        onAssetAdded={(asset) => appendImages([asset.url], "generated image")}
      />
    </div>
  );
}
