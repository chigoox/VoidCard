"use client";

import { useRef, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import { markProvisioned } from "./actions";
import { BrandedQR } from "@/components/BrandedQR";
import QRCodeLib from "qrcode";

type WriteState = "idle" | "waiting" | "success" | "error";

// Use the env var so dev/staging environments write the correct URL to tags.
const BASE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://vcard.ed5enterprise.com").trim().replace(/\/+$/, "");

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

  async function provisionCard() {
    const fd = new FormData();
    fd.set("id", cardId);
    const res = await markProvisioned(fd);
    if (res.ok) {
      setProvDone(true);
      return true;
    }
    setWriteError(res.error ?? "Could not mark as provisioned.");
    return false;
  }

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
      if (!provDone) {
        startProvTransition(async () => {
          await provisionCard();
        });
      }
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
    startProvTransition(async () => {
      await provisionCard();
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 rounded-pill border border-onyx-700 px-3 py-1.5 text-xs text-gold transition hover:border-gold/40 hover:text-gold md:rounded-none md:border-0 md:px-0 md:py-0 md:hover:underline"
        title={`Write NFC for ${serial}`}
      >
        QR / NFC
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          className="safe-modal-sheet fixed inset-0 z-50 flex items-end justify-center bg-[rgba(7,7,9,0.84)] backdrop-blur-sm sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-label={`NFC write for ${serial}`}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              cancelWrite();
              setOpen(false);
            }
          }}
        >
          <div className="safe-max-h-screen w-full max-w-lg space-y-5 overflow-y-auto rounded-t-[28px] border border-white/10 bg-[#09090b] p-5 text-[#f5f1e8] shadow-[0_32px_120px_-36px_rgba(0,0,0,0.9),0_0_0_1px_rgba(255,255,255,0.04)] sm:rounded-[28px] sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg text-[#f5f1e8]">Write NFC tag</p>
                <p className="text-xs text-[#9f998d]">Serial: <span className="font-mono text-[#f5f1e8]">{serial}</span></p>
              </div>
              <button
                type="button"
                onClick={() => { cancelWrite(); setOpen(false); }}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-[#c7c2b5] transition hover:border-white/20 hover:bg-white/10 hover:text-white"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {/* QR code */}
            <div className="space-y-3 rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs uppercase tracking-[0.2em] text-[#9f998d]">Card QR code</p>
                <button
                  type="button"
                  onClick={downloadQr}
                  className="inline-flex items-center justify-center self-start rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-[#f5f1e8] transition hover:border-[#d4af37]/40 hover:bg-white/10 hover:text-[#f8d77b]"
                >
                  ↓ Download PNG
                </button>
              </div>
              <div className="flex justify-center rounded-2xl border border-white/10 bg-[#050506] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <BrandedQR
                  value={tapUrl}
                  size={220}
                  className="h-auto w-full max-w-[220px]"
                  variant="onyx"
                  withLogo
                  logoText="V"
                />
              </div>
              <p className="text-center text-[10px] text-[#9f998d]">
                Print and attach to card packaging · same URL as NFC tag
              </p>
            </div>

            {/* URL to write */}
            <div className="space-y-2 rounded-[20px] border border-white/10 bg-white/5 p-3">
              <p className="text-xs uppercase tracking-[0.2em] text-[#9f998d]">URL to write on tag</p>
              <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#050506] px-3 py-2 sm:flex-row sm:items-start sm:gap-3">
                <code className="min-w-0 flex-1 whitespace-pre-wrap break-all text-xs text-[#f5f1e8]">{tapUrl}</code>
                <button
                  type="button"
                  onClick={copyUrl}
                  className="shrink-0 text-left text-xs font-medium text-[#f8d77b] hover:underline sm:pt-0.5"
                >
                  {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Step instructions */}
            <ol className="space-y-3 rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-[#c7c2b5]">
              <li className="flex gap-2">
                <span className="shrink-0 font-display text-[#f8d77b]">1.</span>
                {nfcSupported
                  ? "Hold a blank NTAG215 tag to the back of this phone, then tap Write NFC below."
                  : "Open NFC Tools (Android/iOS), tap Write → Add record → URL, paste the URL above, then tap Write / OK and hold the tag."}
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-display text-[#f8d77b]">2.</span>
                Built-in NFC writes auto-mark the card provisioned. If you write with an external app or print only the QR, tap &ldquo;Mark provisioned&rdquo; after the write succeeds.
              </li>
              <li className="flex gap-2">
                <span className="shrink-0 font-display text-[#f8d77b]">3.</span>
                Ship the card. When the customer taps it, they&apos;ll be walked through pairing automatically.
              </li>
            </ol>

            {/* NFC write button (Android Chrome only) */}
            {nfcSupported && (
              <div className="space-y-2">
                {writeState === "waiting" ? (
                  <div className="flex items-center justify-between rounded-2xl border border-[#d4af37]/35 bg-[rgba(212,175,55,0.12)] px-4 py-3">
                    <span className="animate-pulse text-sm text-[#f8d77b]">Hold tag to phone…</span>
                    <button type="button" onClick={cancelWrite} className="text-xs text-[#c7c2b5] underline hover:text-white">
                      Cancel
                    </button>
                  </div>
                ) : writeState === "success" ? (
                  <div className="rounded-2xl border border-emerald-500/35 bg-emerald-500/12 px-4 py-3 text-sm text-emerald-200">
                    ✓ Tag written successfully
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={writeNfc}
                    className="w-full rounded-2xl bg-[linear-gradient(135deg,#f5e9b0_0%,#d4af37_52%,#8c6c1e_100%)] px-4 py-2.5 font-medium text-[#09090b] shadow-[0_18px_44px_-20px_rgba(212,175,55,0.45)] transition hover:brightness-105"
                  >
                    Write NFC tag
                  </button>
                )}
                {writeState === "error" && writeError && (
                  <p className="text-xs text-rose-300">{writeError}</p>
                )}
              </div>
            )}

            {/* Mark provisioned */}
            <div className="border-t border-white/10 pt-4">
              {provDone ? (
                <p className="text-center text-sm text-emerald-200">✓ Marked as provisioned</p>
              ) : (
                <button
                  type="button"
                  onClick={handleProvision}
                  disabled={provPending}
                  className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-[#f5f1e8] transition hover:border-[#d4af37]/40 hover:bg-white/10 disabled:opacity-60"
                >
                  {provPending ? "Saving…" : "Mark provisioned (ready to ship)"}
                </button>
              )}
            </div>
          </div>
        </div>, document.body
      )}
    </>
  );
}
