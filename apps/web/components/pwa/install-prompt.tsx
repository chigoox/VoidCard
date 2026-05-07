"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "voidcard:pwa-install-dismissed";

export function InstallPrompt() {
  const [evt, setEvt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (localStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!visible || !evt) return null;

  return (
    <div
      role="dialog"
      aria-label="Install VoidCard"
      className="fixed inset-x-3 bottom-3 z-50 flex items-center gap-3 rounded-card border border-paper-200 bg-white/95 p-3 shadow-soft-lg backdrop-blur sm:inset-x-auto sm:right-4 sm:max-w-sm"
    >
      <div className="flex-1 text-sm">
        <p className="font-medium text-ink">Install VoidCard</p>
        <p className="text-xs text-ink-400">Quick access from your home screen.</p>
      </div>
      <button
        type="button"
        className="rounded-md px-2 py-1 text-xs text-ink-400 hover:text-ink"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, String(Date.now()));
          setVisible(false);
        }}
      >
        Not now
      </button>
      <button
        type="button"
        className="btn-primary text-xs"
        onClick={async () => {
          await evt.prompt();
          const { outcome } = await evt.userChoice;
          if (outcome !== "accepted") {
            localStorage.setItem(DISMISS_KEY, String(Date.now()));
          }
          setVisible(false);
          setEvt(null);
        }}
      >
        Install
      </button>
    </div>
  );
}
