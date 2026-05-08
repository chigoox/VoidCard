"use client";

import { useRef, useState, useTransition } from "react";
import { markProvisioned } from "./actions";
import { BrandedQR } from "@/components/BrandedQR";
import QRCodeLib from "qrcode";

type WriteState = "idle" | "waiting" | "success" | "error";

// Use the env var so dev/staging environments write the correct URL to tags.
const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vcard.ed5enterprise.com";

export function AdminNfcWriter({
  cardId,
  serial,
  currentStatus,
}: {
  cardId: string;
  serial: string;
  currentStatus: string;
}) {
  const [open, setOpen] = useState(false);
  const [writeState, setWriteState] = useState<WriteState>("idle");
  const [writeError, setWriteError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [provPending, startProvTransition] = useTransition();
  const [provDone, setProvDone] = useState(currentStatus !== "unprovisioned");
  const abortRef = useRef<AbortController | null>(null);

  const tapUrl = `${BASE_URL}/c/${cardId}`;
  const nfcSupported = typeof window !== "undefined" && "NDEFReader" in window;

  function copyUrl() {
    navigator.clipboard.writeText(tapUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function writeNfc() {
    setWriteError(null);
    setWriteState("waiting");
    const abort = new AbortController();
    abortRef.current = abort;
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ndef = new (window as any).NDEFReader();
      await ndef.write(
        { records: [{ recordType: "url", data: tapUrl }] },
        { signal: abort.signal, overwrite: true },
      );
      setWriteState("success");
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") {
        setWriteState("idle");
        return;
      }
      setWriteError(err instanceof Error ? err.message : "Write failed.");
      setWriteState("error");
    }
  }

  async function downloadQr() {
    const dataUrl = await QRCodeLib.toDataURL(tapUrl, {
      width: 512,
      margin: 2,
      color: { dark: "#f7f3ea", light: "#0a0a0b" },
    });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `voidcard-qr-${serial}.png`;
    a.click();
  }

  function cancelWrite() {
    abortRef.current?.abort();
    setWriteState("idle");
  }

  function handleProvision() {
    const fd = new FormData();
    fd.set("id", cardId);
    startProvTransition(async () => {
      const res = await markProvisioned(fd);
      if (res.ok) setProvDone(true);
      else setWriteError(res.error ?? "Could not mark as provisioned.");
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-gold hover:underline"
        title={`Write NFC for ${serial}`}
      >
        NFC ›
      </button>

      {open && (
        <div
          className="safe-modal-frame fixed inset-0 z-50 flex items-center justify-center bg-black/70"
          role="dialog"
          aria-modal="true"
          aria-label={`NFC write for ${serial}`}
        >
          <div className="safe-max-h-screen w-full max-w-md space-y-5 overflow-y-auto rounded-2xl border border-onyx-700 bg-onyx-950 p-6 shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-display text-lg text-gold-grad">Write NFC tag</p>
                <p className="text-xs text-ivory-mute">Serial: <span className="font-mono text-ivory">{serial}</span></p>
              </div>
              <button
                type="button"
                onClick={() => { cancelWrite(); setOpen(false); }}
                className="text-ivory-dim hover:text-ivory"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* QR code */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs uppercase tracking-widest text-ivory-mute">Card QR code</p>
                <button
                  type="button"
                  onClick={downloadQr}
                  className="text-xs text-gold hover:underline"
                >
                  ↓ Download PNG
                </button>
              </div>
              <div className="flex justify-center rounded-xl border border-onyx-700 bg-onyx-900 p-4">
                <BrandedQR value={tapUrl} size={180} variant="onyx" withLogo logoText="V" />
              </div>
              <p className="text-center text-[10px] text-ivory-mute">
                Print and attach to card packaging · same URL as NFC tag
              </p>
            </div>

            {/* URL to write */}
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-widest text-ivory-mute">URL to write on tag</p>
              <div className="flex items-center gap-2 rounded-lg border border-onyx-700 bg-onyx-900 px-3 py-2">
                <code className="min-w-0 flex-1 truncate text-xs text-ivory">{tapUrl}</code>
                <button
                  type="button"
                  onClick={copyUrl}
                  className="shrink-0 text-xs text-gold hover:underline"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Step instructions */}
            <ol className="space-y-2 text-sm text-ivory-dim">
              <li className="flex gap-2">
                <span className="shrink-0 font-display text-gold">1.</span>
                {nfcSupported
                  ? "Hold a blank NTAG215 tag to the back of this phone, then tap Write NFC below."
                  : "Open NFC Tools (Android/iOS), tap Write → Add record → URL, paste the URL above, then tap Write / OK and hold the tag."}
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-display text-gold">2.</span>
                Once written, tap &ldquo;Mark provisioned&rdquo; so the card shows as ready-to-ship.
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-display text-gold">3.</span>
                Ship the card. When the customer taps it, they&apos;ll be walked through pairing automatically.
              </li>
            </ol>

            {/* NFC write button (Android Chrome only) */}
            {nfcSupported && (
              <div className="space-y-2">
                {writeState === "waiting" ? (
                  <div className="flex items-center justify-between rounded-lg border border-gold/40 bg-gold/5 px-4 py-3">
                    <span className="text-sm text-gold animate-pulse">Hold tag to phone…</span>
                    <button type="button" onClick={cancelWrite} className="text-xs text-ivory-dim hover:text-ivory underline">
                      Cancel
                    </button>
                  </div>
                ) : writeState === "success" ? (
                  <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                    ✓ Tag written successfully
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={writeNfc}
                    className="w-full rounded-lg bg-gold px-4 py-2.5 font-medium text-onyx-950 hover:brightness-110"
                  >
                    Write NFC tag
                  </button>
                )}
                {writeState === "error" && writeError && (
                  <p className="text-xs text-red-400">{writeError}</p>
                )}
              </div>
            )}

            {/* Mark provisioned */}
            <div className="border-t border-onyx-800 pt-4">
              {provDone ? (
                <p className="text-center text-sm text-emerald-400">✓ Marked as provisioned</p>
              ) : (
                <button
                  type="button"
                  onClick={handleProvision}
                  disabled={provPending}
                  className="w-full rounded-lg border border-onyx-600 bg-onyx-900 px-4 py-2.5 text-sm text-ivory hover:border-gold/50 disabled:opacity-60"
                >
                  {provPending ? "Saving…" : "Mark provisioned (ready to ship)"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
