"use client";

import { useCallback, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { RotateCcw, RotateCw } from "lucide-react";

const ASPECTS = [
  { label: "Square", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "4:5", value: 4 / 5 },
  { label: "3:2", value: 3 / 2 },
] as const;

function radians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function rotatedSize(width: number, height: number, rotation: number) {
  const rot = radians(rotation);
  return {
    width: Math.abs(Math.cos(rot) * width) + Math.abs(Math.sin(rot) * height),
    height: Math.abs(Math.sin(rot) * width) + Math.abs(Math.cos(rot) * height),
  };
}

async function cropToBlob(src: string, pixels: Area, rotation: number): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const rotated = rotatedSize(img.width, img.height, rotation);
  const canvas = document.createElement("canvas");
  canvas.width = rotated.width;
  canvas.height = rotated.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  ctx.translate(rotated.width / 2, rotated.height / 2);
  ctx.rotate(radians(rotation));
  ctx.translate(-img.width / 2, -img.height / 2);
  ctx.drawImage(img, 0, 0);

  const cropped = document.createElement("canvas");
  cropped.width = pixels.width;
  cropped.height = pixels.height;
  const croppedCtx = cropped.getContext("2d");
  if (!croppedCtx) throw new Error("Canvas not supported");
  croppedCtx.drawImage(canvas, pixels.x, pixels.y, pixels.width, pixels.height, 0, 0, pixels.width, pixels.height);
  return new Promise<Blob>((resolve, reject) =>
    cropped.toBlob((b) => (b ? resolve(b) : reject(new Error("Crop failed"))), "image/jpeg", 0.92),
  );
}

export function CropModal({
  src,
  filename,
  onConfirm,
  onCancel,
  onUseOriginal,
}: {
  src: string;
  filename?: string;
  onConfirm: (blob: Blob) => void;
  onCancel: () => void;
  onUseOriginal?: () => void;
}) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [aspect, setAspect] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedPixels, setCroppedPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedPixels(pixels);
  }, []);

  async function handleConfirm() {
    if (!croppedPixels || busy) return;
    setBusy(true);
    try {
      const blob = await cropToBlob(src, croppedPixels, rotation);
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
        <div>
          <h2 className="text-base font-medium text-ivory">Adjust image</h2>
          {filename ? <p className="mt-1 truncate text-xs text-ivory-mute">{filename}</p> : null}
        </div>

        <div className="relative h-64 w-full overflow-hidden rounded-card bg-black sm:h-80">
          <Cropper
            image={src}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="flex flex-col gap-3">
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

          <div className="flex items-center gap-2">
            <button type="button" className="btn-ghost p-2" onClick={() => setRotation((value) => value - 90)} aria-label="Rotate left">
              <RotateCcw className="size-4" aria-hidden />
            </button>
            <input
              type="range"
              min={-180}
              max={180}
              step={1}
              value={rotation}
              onChange={(event) => setRotation(Number(event.target.value))}
              className="min-w-0 flex-1 accent-gold"
              aria-label="Rotation"
            />
            <button type="button" className="btn-ghost p-2" onClick={() => setRotation((value) => value + 90)} aria-label="Rotate right">
              <RotateCw className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {onUseOriginal ? (
            <button type="button" className="btn-ghost px-4 py-2 text-sm" onClick={onUseOriginal} disabled={busy}>
              Upload original
            </button>
          ) : null}
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
