"use client";

import { useEffect, useRef, useState } from "react";

function extractCardId(text: string): string | null {
  const m = text.match(/\/c\/([a-f0-9-]{36})/i);
  return m ? m[1] : null;
}

type Props = {
  onScan: (cardId: string) => void;
  onClose: () => void;
};

export function QrScannerModal({ onScan, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const activeRef = useRef(true);
  const [camError, setCamError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  const supported =
    typeof window !== "undefined" && "BarcodeDetector" in window;

  useEffect(() => {
    if (!supported) return;
    activeRef.current = true;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const detector = new (window as any).BarcodeDetector({
      formats: ["qr_code"],
    });

    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 } },
          audio: false,
        });
        streamRef.current = stream;
        if (!videoRef.current || !activeRef.current) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setScanning(true);
        requestAnimationFrame(tick);
      } catch {
        if (activeRef.current) {
          setCamError(
            "Camera access was denied. Grant permission and try again, or enter the card ID manually.",
          );
        }
      }
    }

    async function tick() {
      if (!activeRef.current) return;
      const video = videoRef.current;
      if (!video || video.readyState < 2) {
        requestAnimationFrame(tick);
        return;
      }
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const results: Array<{ rawValue: string }> = await detector.detect(video);
        if (results.length > 0 && activeRef.current) {
          const raw = results[0].rawValue;
          const id = extractCardId(raw) ?? raw.trim();
          if (id) {
            activeRef.current = false;
            streamRef.current?.getTracks().forEach((t) => t.stop());
            onScan(id);
            return;
          }
        }
      } catch {
        // detection frame failed, keep trying
      }
      requestAnimationFrame(tick);
    }

    start();

    return () => {
      activeRef.current = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [supported, onScan]);

  return (
    <div
      className="safe-modal-sheet fixed inset-0 z-50 flex items-end justify-center bg-black/80 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label="Scan QR code"
    >
      <div className="safe-max-h-screen w-full max-w-sm space-y-4 overflow-y-auto rounded-t-2xl border border-onyx-700 bg-onyx-950 p-5 sm:rounded-2xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="font-display text-lg text-gold-grad">Scan QR code</p>
            <p className="text-xs text-ivory-mute">
              Point the camera at the QR code printed on your card
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-ivory-dim hover:text-ivory"
            aria-label="Close scanner"
          >
            ✕
          </button>
        </div>

        {/* Camera / error states */}
        {!supported ? (
          <div className="rounded-lg border border-onyx-700 bg-onyx-900 py-10 text-center text-sm text-ivory-dim">
            <p className="font-medium text-ivory">QR scanning unavailable</p>
            <p className="mt-1 text-xs">
              Use Chrome 83+ or Safari on iOS 17+. Enter the card ID manually
              instead.
            </p>
          </div>
        ) : camError ? (
          <div className="rounded-lg border border-red-500/40 bg-red-950/30 py-6 px-4 text-center text-sm text-red-300">
            {camError}
          </div>
        ) : (
          <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-black">
            <video
              ref={videoRef}
              className="h-full w-full object-cover"
              playsInline
              muted
              aria-label="Camera viewfinder"
            />

            {/* Dimmed overlay with clear centre window */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div
                className="relative h-52 w-52"
                style={{
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                  borderRadius: 12,
                }}
              >
                {/* Animated corner guides */}
                {(["tl", "tr", "bl", "br"] as const).map((pos) => (
                  <span
                    key={pos}
                    aria-hidden="true"
                    className={[
                      "absolute h-8 w-8 border-gold",
                      pos === "tl"
                        ? "left-0 top-0 border-l-2 border-t-2 rounded-tl-lg"
                        : pos === "tr"
                          ? "right-0 top-0 border-r-2 border-t-2 rounded-tr-lg"
                          : pos === "bl"
                            ? "left-0 bottom-0 border-l-2 border-b-2 rounded-bl-lg"
                            : "right-0 bottom-0 border-r-2 border-b-2 rounded-br-lg",
                    ].join(" ")}
                  />
                ))}
                {scanning && (
                  <div className="absolute inset-x-0 top-0 h-0.5 animate-[scan_2s_ease-in-out_infinite] bg-gold/70" />
                )}
              </div>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-lg border border-onyx-700 bg-onyx-900 py-2.5 text-sm text-ivory-dim hover:text-ivory"
        >
          Enter ID manually instead
        </button>
      </div>
    </div>
  );
}
