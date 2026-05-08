"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";

const ASPECTS = [
  { label: "Square", value: 1 },
  { label: "16:9", value: 16 / 9 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:2", value: 3 / 2 },
] as const;

async function cropToBlob(src: string, pixels: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const canvas = document.createElement("canvas");
  canvas.width = pixels.width;
  canvas.height = pixels.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");
  ctx.drawImage(img, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, pixels.width, pixels.height);
  return new Promise<Blob>((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Crop failed"))), "image/jpeg", 0.92),
  );
}

export function CropModal({
  src,
  onConfirm,
  onCancel,
}: {
  src: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(1);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedPixels || busy) return;
    setBusy(true);
    try {
      const blob = await cropToBlob(src, croppedPixels);
      onConfirm(blob);
    } catch {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Crop image"
      data-testid="crop-modal"
    >
      <div className="flex w-full flex-col gap-4 rounded-t-card border border-onyx-700 bg-onyx-950 p-4 sm:max-w-lg sm:rounded-card">
        <h2 className="text-base font-medium text-ivory">Crop image</h2>

        {/* cropper */}
        <div className="relative h-64 w-full overflow-hidden rounded-card bg-black sm:h-80">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        {/* controls */}
        <div className="flex flex-col gap-3">
          {/* aspect ratio pills */}
          <div className="flex flex-wrap gap-1.5">
            {ASPECTS.map((a) => (
              <button
                key={a.label}
                type="button"
                onClick={() => setAspect(a.value)}
                className={`rounded-pill border px-3 py-1 text-xs transition ${
                  aspect === a.value
                    ? "border-gold/60 bg-gold/10 text-gold"
                    : "border-onyx-700 text-ivory-mute hover:border-onyx-500"
                }`}
              >
                {a.label}
              </button>
            ))}
          </div>

          {/* zoom slider */}
          <div className="flex items-center gap-3">
            <span className="shrink-0 text-xs text-ivory-mute">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="flex-1 accent-gold"
              aria-label="Zoom"
            />
          </div>
        </div>

        {/* actions */}
        <div className="flex justify-end gap-2">
          <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-gold px-4 py-2 text-sm"
            onClick={handleConfirm}
            disabled={busy || !croppedPixels}
            data-testid="crop-confirm"
          >
            {busy ? "Applying…" : "Apply crop"}
          </button>
        </div>
      </div>
    </div>
  );
}
