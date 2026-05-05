"use client";

import { useEffect, useState } from "react";

export function UpdateToast() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let registration: ServiceWorkerRegistration | null = null;

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
        registration = reg;
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
      className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-card border border-gold/30 bg-onyx-900/95 p-3 shadow-2xl backdrop-blur sm:inset-x-auto sm:right-4 sm:max-w-sm"
    >
      <div className="flex-1 text-sm">
        <p className="font-medium text-ivory">Update available</p>
        <p className="text-xs text-ivory-mute">Reload to get the latest version.</p>
      </div>
      <button
        type="button"
        className="btn-gold text-xs"
        onClick={async () => {
          if (!("serviceWorker" in navigator)) return;
          const reg = await navigator.serviceWorker.ready;
          reg.waiting?.postMessage({ type: "SKIP_WAITING" });
          // controllerchange listener will reload.
        }}
      >
        Reload
      </button>
    </div>
  );
}
