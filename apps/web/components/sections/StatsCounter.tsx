"use client";

import { useEffect, useRef, useState } from "react";

/** Splits "4.9★" / "$1.2M" / "250+" into prefix, number and suffix. */
export function parseStat(value: string) {
  const match = value.match(/^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/);
  if (!match) return null;
  const [, prefix, raw, suffix] = match;
  const number = Number(raw!.replace(/,/g, ""));
  if (!Number.isFinite(number)) return null;
  const decimals = raw!.includes(".") ? raw!.split(".")[1]!.length : 0;
  return { prefix: prefix ?? "", number, suffix: suffix ?? "", decimals, grouped: raw!.includes(",") };
}

/** Counts a stat up from zero the first time it scrolls into view. */
export function StatsCounter({ value }: { value: string }) {
  const parsed = parseStat(value);
  const ref = useRef<HTMLSpanElement | null>(null);
  const [shown, setShown] = useState<string>(value);

  useEffect(() => {
    const node = ref.current;
    if (!node || !parsed) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const format = (n: number) => {
      const fixed = n.toFixed(parsed.decimals);
      const body = parsed.grouped ? Number(fixed).toLocaleString("en-US", { minimumFractionDigits: parsed.decimals, maximumFractionDigits: parsed.decimals }) : fixed;
      return `${parsed.prefix}${body}${parsed.suffix}`;
    };
    let frame = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return;
      observer.disconnect();
      const start = performance.now();
      const duration = 1400;
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - (1 - t) ** 4;
        setShown(format(parsed.number * eased));
        if (t < 1) frame = requestAnimationFrame(tick);
      };
      setShown(format(0));
      frame = requestAnimationFrame(tick);
    }, { threshold: 0.4 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
    // parsed is derived from value
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return <span ref={ref} className="tabular-nums">{shown}</span>;
}
