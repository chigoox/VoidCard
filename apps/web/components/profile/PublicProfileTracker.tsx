"use client";

import "client-only";
import { useEffect, useRef } from "react";

export function PublicProfileTracker({ username, variantId }: { username: string; variantId?: string }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;

    const payload = JSON.stringify({
      username,
      source: "link",
      referrer: document.referrer || undefined,
      variantId,
    });
    const blob = new Blob([payload], { type: "application/json" });

    if (navigator.sendBeacon?.("/api/analytics/track", blob)) return;

    void fetch("/api/analytics/track", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => null);
  }, [username, variantId]);

  return null;
}