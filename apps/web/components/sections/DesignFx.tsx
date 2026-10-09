"use client";

import { useEffect } from "react";

const SELECTOR = '.vc-design[data-vc-hover="tilt"], .vc-design[data-vc-surface="spotlight"]';

/**
 * One delegated pointer listener for the whole page drives cursor-reactive
 * designs: spotlight position (--vc-mx/--vc-my) and 3D tilt (--vc-rx/--vc-ry).
 */
export function DesignFx() {
  useEffect(() => {
    if (!window.matchMedia("(hover: hover)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let active: HTMLElement | null = null;
    let frame = 0;

    const reset = (el: HTMLElement) => {
      el.style.removeProperty("--vc-rx");
      el.style.removeProperty("--vc-ry");
    };

    const onMove = (event: PointerEvent) => {
      const target = (event.target as Element | null)?.closest<HTMLElement>(SELECTOR) ?? null;
      if (active && active !== target) reset(active);
      active = target;
      if (!target) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = target.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width;
        const y = (event.clientY - box.top) / box.height;
        target.style.setProperty("--vc-mx", `${(x * 100).toFixed(1)}%`);
        target.style.setProperty("--vc-my", `${(y * 100).toFixed(1)}%`);
        if (target.dataset.vcHover === "tilt") {
          target.style.setProperty("--vc-rx", `${((0.5 - y) * 8).toFixed(2)}deg`);
          target.style.setProperty("--vc-ry", `${((x - 0.5) * 10).toFixed(2)}deg`);
        }
      });
    };
    const onLeave = () => {
      if (active) reset(active);
      active = null;
    };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return null;
}
