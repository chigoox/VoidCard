"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";

export function EmbedSectionClient({
  html,
  height,
  autoHeight,
  allowDomains,
  style,
}: {
  html: string;
  height: number;
  autoHeight: boolean;
  allowDomains: string[];
  style: CSSProperties;
}) {
  const ref = useRef<HTMLIFrameElement | null>(null);
  const [measured, setMeasured] = useState<number | null>(null);

  useEffect(() => {
    if (!autoHeight) return;
    function onMessage(e: MessageEvent) {
      const data = e.data as { type?: string; height?: number } | undefined;
      if (!data || data.type !== "vc:resize" || typeof data.height !== "number") return;
      if (allowDomains.length > 0) {
        const origin = e.origin;
        const ok = allowDomains.some((d) => origin === d || origin.endsWith(`.${d.replace(/^https?:\/\//, "")}`));
        if (!ok) return;
      }
      const next = Math.max(60, Math.min(2000, Math.round(data.height)));
      setMeasured(next);
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [autoHeight, allowDomains]);

  return (
    <iframe
      ref={ref}
      sandbox="allow-scripts allow-same-origin"
      srcDoc={html}
      title="Embedded content"
      style={{ ...style, height: measured ?? height, width: "100%" }}
    />
  );
}
