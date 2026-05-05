"use client";

import { useEffect, useState } from "react";
// consent persists via /api/consent

const STORAGE_KEY = "vc.consent.v1";
const COOKIE_ID_KEY = "vc.cookie_id";

type Choice = { analytics: boolean; marketing: boolean; ts: number };

function getOrCreateCookieId(): string {
  let id = localStorage.getItem(COOKIE_ID_KEY);
  if (!id) {
    const bytes = new Uint8Array(16);
    crypto.getRandomValues(bytes);
    id = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
    localStorage.setItem(COOKIE_ID_KEY, id);
  }
  return id;
}

export function ConsentBanner() {
  const [open, setOpen] = useState(false);
  const [customize, setCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setOpen(true);
        return;
      }
      const parsed = JSON.parse(raw) as Choice;
      // Re-prompt every 13 months.
      if (Date.now() - parsed.ts > 13 * 30 * 24 * 60 * 60 * 1000) setOpen(true);
    } catch {
      setOpen(true);
    }
  }, []);

  if (!open) return null;

  async function persist(a: boolean, m: boolean) {
    const id = getOrCreateCookieId();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ analytics: a, marketing: m, ts: Date.now() } satisfies Choice));
    try {
      await fetch("/api/consent", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cookieId: id, analytics: a, marketing: m }),
      });
    } catch {
      /* network failure: client choice still recorded locally */
    }
    setOpen(false);
  }

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-ivory-mute/20 bg-onyx/95 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="text-sm text-ivory-dim">
          We use essential cookies to run VoidCard. With your permission, we also use analytics and marketing cookies to
          improve the product.{" "}
          <a href="/legal/cookies" className="text-gold underline">
            Learn more
          </a>
          .
        </div>
        {customize ? (
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked disabled className="accent-gold" /> Essential
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={analytics}
                onChange={(e) => setAnalytics(e.target.checked)}
                className="accent-gold"
              />{" "}
              Analytics
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                className="accent-gold"
              />{" "}
              Marketing
            </label>
            <button onClick={() => persist(analytics, marketing)} className="btn-gold ml-2">
              Save
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <button onClick={() => persist(false, false)} className="btn-secondary">
              Reject all
            </button>
            <button onClick={() => setCustomize(true)} className="btn-secondary">
              Customize
            </button>
            <button onClick={() => persist(true, true)} className="btn-gold">
              Accept all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
