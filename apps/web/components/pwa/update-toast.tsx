"use client";

import { useEffect, useState } from "react";
import { RefreshCw, X } from "lucide-react";

export function UpdateToast() {
  const [show, setShow] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const onControllerChange = () => {
      // Active worker changed — reload once to pick up new assets.
      window.location.reload();
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    navigator.serviceWorker.ready
      .then((reg) => {
        setRegistration(reg);
        const showIfWaiting = () => {
          if (reg.waiting) setShow(true);
        };
        showIfWaiting();
        reg.addEventListener("updatefound", () => {
          const sw = reg.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              setShow(true);
            }
          });
        });
      })
      .catch(() => {});

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
    };
  }, []);

  if (!show) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="safe-floating-bottom fixed z-50 flex items-center gap-3 rounded-card border border-paper-200 bg-white/95 p-3 shadow-soft-lg backdrop-blur sm:max-w-sm"
    >
      <RefreshCw className="size-4 shrink-0 text-ink-400" aria-hidden />
      <div className="flex-1 text-sm">
        <p className="font-medium text-ink">Update available</p>
        <p className="text-xs text-ink-400">Reload to get the latest version.</p>
      </div>
      <button
        type="button"
        className="btn-primary flex items-center gap-1.5 text-xs"
        onClick={async () => {
          setReloading(true);
          if (!("serviceWorker" in navigator)) {
            window.location.reload();
            return;
          }

          const reg = registration ?? await navigator.serviceWorker.ready;
          const waiting = reg.waiting;
          if (waiting) {
            waiting.postMessage({ type: "SKIP_WAITING" });
            waiting.postMessage("SKIP_WAITING");
          }

          window.setTimeout(async () => {
            if (waiting) await reg.unregister().catch(() => false);
            window.location.reload();
          }, waiting ? 700 : 0);
        }}
        disabled={reloading}
      >
        <RefreshCw className={["size-3", reloading ? "animate-spin" : ""].join(" ").trim()} aria-hidden />
        {reloading ? "Reloading" : "Reload"}
      </button>
      <button
        type="button"
        aria-label="Dismiss update notification"
        className="rounded p-1 text-ink-400 hover:bg-paper-100 hover:text-ink"
        onClick={() => setShow(false)}
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
