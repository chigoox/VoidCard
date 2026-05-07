"use client";

import { useRef, useState, useTransition } from "react";
import { pairCardAction } from "./actions";
import { QrScannerModal } from "@/components/QrScannerModal";

type WriteState = "idle" | "scanning" | "read" | "error";

function extractCardId(url: string): string | null {
  const m = url.match(/\/c\/([a-f0-9-]{36})/i);
  return m ? m[1] : null;
}

// ── Tap-detected confirmation (arrived from physical NFC tap) ─────────────────
function TapConfirm({ cardId, pending, onConfirm }: { cardId: string; pending: boolean; onConfirm: () => void }) {
  return (
    <div className="space-y-5 text-center">
      {/* Animated card icon */}
      <div className="mx-auto flex h-32 w-32 flex-col items-center justify-center rounded-full border-2 border-gold/60 bg-gold/5 shadow-[0_0_40px_rgba(212,168,83,0.2)]">
        <svg width="52" height="52" viewBox="0 0 52 52" fill="none" aria-hidden="true">
          <rect x="4" y="13" width="44" height="28" rx="5" stroke="currentColor" strokeWidth="2" className="text-gold" />
          <path d="M4 22h44" stroke="currentColor" strokeWidth="2" className="text-gold" />
          <rect x="10" y="30" width="10" height="5" rx="1" fill="currentColor" className="text-gold/60" />
        </svg>
        <span className="mt-1 text-[10px] uppercase tracking-widest text-gold">Detected</span>
      </div>

      <div>
        <p className="font-display text-xl text-ivory">VoidCard detected</p>
        <p className="mt-1 text-sm text-ivory-dim">Tap below to link this card to your account.</p>
        <p className="mt-2 font-mono text-[10px] text-ivory-mute break-all">{cardId}</p>
      </div>

      <button
        type="button"
        onClick={onConfirm}
        disabled={pending}
        data-testid="tap-confirm-pair"
        className="w-full rounded-xl bg-gold px-6 py-3.5 font-display text-base font-medium text-onyx-950 shadow-lg hover:brightness-110 disabled:opacity-60"
      >
        {pending ? "Pairing…" : "Claim this card"}
      </button>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function PairCardClient({
  prefillCardId,
  serverError,
}: {
  prefillCardId?: string;
  serverError?: string | null;
}) {
  const [scanState, setScanState] = useState<WriteState>("idle");
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedId, setScannedId] = useState<string | null>(prefillCardId ?? null);
  const [serial, setSerial] = useState(prefillCardId ?? "");
  const [showManual, setShowManual] = useState(!prefillCardId);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [pending, startTransition] = useTransition();
  const abortRef = useRef<AbortController | null>(null);

  const nfcSupported = typeof window !== "undefined" && "NDEFReader" in window;
  const errorMsg = serverError ?? scanError;

  // Submit with cardId hidden + serial for double-check
  function doSubmit(id?: string) {
    const fd = new FormData();
    if (id) {
      fd.set("cardId", id);
      fd.set("serial", id);
    } else {
      if (scannedId) fd.set("cardId", scannedId);
      fd.set("serial", serial.trim());
    }
    startTransition(async () => {
      await pairCardAction(fd);
    });
  }

  // Web NFC scan (for manual-scan flow when arrived NOT via tap)
  async function startScan() {
    setScanError(null);
    setScanState("scanning");
    const abort = new AbortController();
    abortRef.current = abort;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const reader = new (window as any).NDEFReader();
      await reader.scan({ signal: abort.signal });

      reader.onreading = (event: { message: { records: Array<{ recordType: string; toText?: () => string; data?: DataView }> } }) => {
        for (const record of event.message.records) {
          let text = "";
          if (record.toText) text = record.toText();
          else if (record.data) text = new TextDecoder().decode(record.data);

          const id = extractCardId(text) ?? text.trim();
          if (id) {
            abort.abort();
            setScannedId(id);
            setSerial(id);
            setScanState("read");
            return;
          }
        }
        setScanError("Tag read but no card ID found. Try manual entry.");
        setScanState("error");
      };

      reader.onreadingerror = () => {
        setScanError("Could not read the tag. Try again or enter the serial manually.");
        setScanState("error");
      };
    } catch (err: unknown) {
      if ((err as { name?: string }).name === "AbortError") { setScanState("idle"); return; }
      const msg = err instanceof Error ? err.message : "NFC scan failed.";
      setScanError(msg.includes("NotAllowed") ? "NFC permission denied. Enter the serial manually." : msg);
      setScanState("error");
    }
  }

  function stopScan() { abortRef.current?.abort(); setScanState("idle"); }

  function handleQrScan(id: string) {
    setShowQrScanner(false);
    setScannedId(id);
    setSerial(id);
    doSubmit(id);
  }

  // ── If we arrived from a physical tap, show the confirm screen ──────────────
  if (prefillCardId && !serverError) {
    return (
      <>
        {errorMsg && (
          <div role="alert" data-testid="pair-error" className="rounded-md border border-red-500/60 bg-red-950/40 p-3 text-sm text-red-200">
            {errorMsg}
          </div>
        )}
        <TapConfirm cardId={prefillCardId} pending={pending} onConfirm={() => doSubmit(prefillCardId)} />
        <p className="text-center text-xs text-ivory-dim">
          Wrong card?{" "}
          <button type="button" onClick={() => setShowManual(true)} className="underline underline-offset-2 hover:text-ivory" data-testid="toggle-manual">
            Enter serial manually
          </button>
        </p>
        {showManual && (
          <form onSubmit={(e) => { e.preventDefault(); doSubmit(); }} className="space-y-3 border-t border-onyx-800 pt-4">
            <label className="mb-1 block text-xs uppercase tracking-widest text-ivory-dim" htmlFor="serial-override">Serial or card ID</label>
            <input id="serial-override" name="serial" value={serial} onChange={(e) => setSerial(e.target.value)} className="w-full rounded-md border border-onyx-700 bg-onyx-950 px-3 py-2 font-mono text-ivory focus:border-gold focus:outline-none" autoComplete="off" placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
            <button type="submit" disabled={pending} className="w-full rounded-md bg-gold px-4 py-2 font-medium text-onyx-950 hover:brightness-110 disabled:opacity-60">Pair card</button>
          </form>
        )}
      </>
    );
  }

  // ── Manual / NFC scan flow ───────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {errorMsg && (
        <div role="alert" data-testid="pair-error" className="rounded-md border border-red-500/60 bg-red-950/40 p-3 text-sm text-red-200">
          {errorMsg}
        </div>
      )}

      {/* NFC scan tap target */}
      {nfcSupported && scanState !== "read" && (
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={scanState === "scanning" ? stopScan : startScan}
            data-testid="nfc-scan-btn"
            className={[
              "relative flex h-44 w-44 flex-col items-center justify-center gap-3 rounded-full border-2 transition-all duration-300",
              scanState === "scanning"
                ? "border-gold bg-gold/10 shadow-[0_0_40px_rgba(212,168,83,0.3)] animate-pulse"
                : "border-onyx-600 bg-onyx-900 hover:border-gold/60",
            ].join(" ")}
          >
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none" aria-hidden="true">
              <rect x="16" y="8" width="24" height="40" rx="4" stroke="currentColor" strokeWidth="2" className={scanState === "scanning" ? "text-gold" : "text-ivory-dim"} />
              <path d="M30 28a4 4 0 0 0-4 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={scanState === "scanning" ? "text-gold" : "text-ivory-mute"} />
              <path d="M34 24a10 10 0 0 0-12 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={scanState === "scanning" ? "text-gold" : "text-ivory-mute"} />
              <path d="M38 20a16 16 0 0 0-20 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={scanState === "scanning" ? "text-gold" : "text-ivory-mute"} />
            </svg>
            <span className={["text-xs uppercase tracking-widest font-medium", scanState === "scanning" ? "text-gold" : "text-ivory-mute"].join(" ")}>
              {scanState === "scanning" ? "Hold card to phone…" : "Tap to scan"}
            </span>
          </button>
          {scanState === "scanning" && (
            <button type="button" onClick={stopScan} className="text-xs text-ivory-dim underline underline-offset-2 hover:text-ivory">Cancel</button>
          )}
        </div>
      )}

      {/* QR code scan — works on iOS, Android, desktop */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => setShowQrScanner(true)}
          data-testid="qr-scan-btn"
          className={[
            "flex items-center gap-2.5 rounded-full border px-6 py-3 text-sm font-medium transition-colors",
            nfcSupported
              ? "border-onyx-600 bg-onyx-900 text-ivory-dim hover:border-gold/60 hover:text-ivory"
              : "border-gold/50 bg-gold/10 text-gold hover:border-gold hover:bg-gold/20",
          ].join(" ")}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" />
            <rect x="14" y="3" width="7" height="7" />
            <rect x="3" y="14" width="7" height="7" />
            <path d="M14 14h3v3M17 20v1M20 14v3M20 20h1" />
          </svg>
          Scan QR code
        </button>
        {!nfcSupported && (
          <p className="text-xs text-ivory-mute">
            Point your camera at the QR code on your card
          </p>
        )}
      </div>

      {/* Manual form — always shown on non-NFC, or after a successful scan */}
      {(scanState === "read" || !nfcSupported) && (
        <form onSubmit={(e) => { e.preventDefault(); doSubmit(); }} className="space-y-4" data-testid="pair-form">
          {scannedId && <input type="hidden" name="cardId" value={scannedId} />}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-ivory-dim" htmlFor="serial">Serial or card ID</label>
            <input id="serial" name="serial" data-testid="pair-serial" value={serial} onChange={(e) => setSerial(e.target.value)} className="w-full rounded-md border border-onyx-700 bg-onyx-950 px-3 py-2 font-mono text-ivory focus:border-gold focus:outline-none" autoComplete="off" required={!scannedId} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </div>
          <button type="submit" disabled={pending} data-testid="pair-submit" className="w-full rounded-md bg-gold px-4 py-2 font-medium text-onyx-950 hover:brightness-110 disabled:opacity-60">
            {pending ? "Pairing…" : "Pair card"}
          </button>
        </form>
      )}

      <p className="text-center text-xs text-ivory-dim">
        <button
          type="button"
          onClick={() => { setShowManual(!showManual); stopScan(); }}
          className="underline underline-offset-2 hover:text-ivory"
          data-testid="toggle-manual"
        >
          {showManual ? (nfcSupported ? "Use NFC scan instead" : "Hide manual entry") : "Enter serial manually"}
        </button>
      </p>

      {showManual && (
        <form onSubmit={(e) => { e.preventDefault(); doSubmit(); }} className="space-y-4" data-testid="pair-form-manual">
          {scannedId && <input type="hidden" name="cardId" value={scannedId} />}
          <div>
            <label className="mb-1 block text-xs uppercase tracking-widest text-ivory-dim" htmlFor="serial-manual">Serial or card ID</label>
            <input id="serial-manual" name="serial" data-testid="pair-serial-manual" value={serial} onChange={(e) => setSerial(e.target.value)} className="w-full rounded-md border border-onyx-700 bg-onyx-950 px-3 py-2 font-mono text-ivory focus:border-gold focus:outline-none" autoComplete="off" required placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" />
          </div>
          <button type="submit" disabled={pending} data-testid="pair-submit-manual" className="w-full rounded-md bg-gold px-4 py-2 font-medium text-onyx-950 hover:brightness-110 disabled:opacity-60">
            {pending ? "Pairing…" : "Pair card"}
          </button>
        </form>
      )}

      {showQrScanner && (
        <QrScannerModal onScan={handleQrScan} onClose={() => setShowQrScanner(false)} />
      )}
    </div>
  );
}

