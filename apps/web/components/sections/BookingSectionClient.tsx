"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

const BOOX_ORIGINS = [
  "https://boox.ed5enterprise.com",
  "https://booking.ed5enterprise.com",
  "https://booxlit.com",
  "https://www.booxlit.com",
];

function isBooxOrigin(origin: string): boolean {
  if (BOOX_ORIGINS.includes(origin)) return true;
  if (process.env.NODE_ENV !== "production") {
    return origin.startsWith("http://localhost:") || origin.startsWith("http://127.0.0.1:");
  }
  return false;
}

export function BookingSectionClient({
  ownerSlug,
  height,
  theme,
  ctaLabel,
  mode,
  style,
}: {
  ownerSlug: string;
  height: number;
  theme: "onyx" | "light";
  ctaLabel: string;
  mode: "embed" | "button";
  style: CSSProperties;
}) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const [measured, setMeasured] = useState<number | null>(null);

  const baseUrl =
    process.env.NEXT_PUBLIC_BOOX_URL?.replace(/\/$/, "") ?? "https://boox.ed5enterprise.com";
  const slug = encodeURIComponent(ownerSlug.trim());
  const params = new URLSearchParams({ embed: "1", theme, ref: "vcard" });
  const embedSrc = `${baseUrl}/${slug}/Booking?${params.toString()}`;
  const externalUrl = `${baseUrl}/${slug}/Booking`;

  useEffect(() => {
    if (mode !== "embed") return;
    function onMessage(e: MessageEvent) {
      if (!isBooxOrigin(e.origin)) return;
      const data = e.data as { type?: string; height?: number } | undefined;
      if (!data || data.type !== "boox:resize" || typeof data.height !== "number") return;
      const next = Math.max(320, Math.min(4000, Math.round(data.height)));
      setMeasured(next);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [mode]);

  if (mode === "button") {
    return (
      <a
        href={externalUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center rounded-pill px-4 py-3 text-sm font-medium"
        style={{ background: "var(--vc-accent, #d4af37)", color: "var(--vc-bg, #0a0a0a)" }}
        data-section-type="booking"
      >
        {ctaLabel}
      </a>
    );
  }

  if (!ownerSlug.trim()) {
    return (
      <div
        className="flex items-center justify-center p-6 text-xs"
        style={{ ...style, color: "var(--vc-fg-mute, #a8a39a)" }}
      >
        Connect your Boox account to enable bookings.
      </div>
    );
  }

  return (
    <iframe
      ref={ref}
      src={embedSrc}
      title="Booking"
      loading="lazy"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
      allow="payment *; clipboard-write"
      style={{ ...style, height: measured ?? height, width: "100%", border: 0 }}
    />
  );
}
