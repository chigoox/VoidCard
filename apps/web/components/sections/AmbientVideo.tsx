"use client";

import { useEffect, useRef } from "react";

/**
 * First-party banners ship as VP9 WebM + H.264 MP4 (see scripts/showcase-media);
 * offer WebM first so every browser finds a codec it can play.
 */
function sourcesFor(src: string): Array<{ src: string; type?: string }> {
  if (/^\/showcase\/[\w-]+\.mp4$/.test(src)) {
    return [{ src: src.replace(/\.mp4$/, ".webm"), type: "video/webm" }, { src, type: "video/mp4" }];
  }
  return [{ src }];
}

/**
 * A muted, looping background video. Plays only while on screen, and stays on
 * its poster for visitors who prefer reduced motion (or on data-saver).
 */
export function AmbientVideo({ src, poster, className }: { src: string; poster?: string; className?: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;
    if (reduced || saveData) {
      video.pause();
      return;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting) void video.play().catch(() => {});
      else video.pause();
    }, { threshold: 0.05 });
    observer.observe(video);
    return () => observer.disconnect();
  }, [src]);

  return (
    <video
      ref={ref}
      className={className}
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      tabIndex={-1}
    >
      {sourcesFor(src).map((source) => <source key={source.src} src={source.src} type={source.type} />)}
    </video>
  );
}
