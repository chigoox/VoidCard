"use client";

import { useEffect, useState, type CSSProperties } from "react";

export type GalleryImage = { src: string; alt: string; category?: string };
export type GalleryLayout = "grid" | "masonry" | "carousel";

export function GallerySectionClient({
  images,
  layout,
  lightbox,
  radius,
}: {
  images: GalleryImage[];
  layout: GalleryLayout;
  lightbox: boolean;
  filters: string[];
  showCategoryStories: boolean;
  radius: string;
}) {
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    if (active === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setActive(null);
      if (e.key === "ArrowRight") setActive((i) => (i === null ? null : (i + 1) % images.length));
      if (e.key === "ArrowLeft") setActive((i) => (i === null ? null : (i - 1 + images.length) % images.length));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, images.length]);

  const itemStyle: CSSProperties = { borderRadius: radius };

  function Tile({ image, index, className, style }: { image: GalleryImage; index: number; className: string; style?: CSSProperties }) {
    return (
      <button
        type="button"
        onClick={lightbox ? () => setActive(index) : undefined}
        className={`block ${className}`}
        style={{ cursor: lightbox ? "zoom-in" : "default", padding: 0, border: 0, background: "transparent" }}
        aria-label={image.alt || `Image ${index + 1}`}
      >
        <img src={image.src} alt={image.alt} loading="lazy" decoding="async" className="block h-full w-full object-cover" style={{ ...itemStyle, ...style }} />
      </button>
    );
  }

  const list = images.map((image, index) => {
    if (layout === "carousel") {
      return <Tile key={index} image={image} index={index} className="aspect-square min-w-[60%] flex-shrink-0 snap-center" />;
    }
    if (layout === "masonry") {
      return (
        <div key={index} className="mb-2 break-inside-avoid">
          <Tile image={image} index={index} className="w-full" />
        </div>
      );
    }
    return <Tile key={index} image={image} index={index} className="aspect-square w-full" />;
  });

  let container: React.ReactNode;
  if (layout === "carousel") {
    container = (
      <div className="flex snap-x snap-mandatory gap-2 overflow-x-auto" style={{ scrollPaddingLeft: 8 }}>
        {list}
      </div>
    );
  } else if (layout === "masonry") {
    container = <div className="columns-2 gap-2 sm:columns-3">{list}</div>;
  } else {
    container = <div className="grid grid-cols-3 gap-2">{list}</div>;
  }

  return (
    <>
      {container}
      {lightbox && active !== null ? (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setActive(null)}
          className="safe-modal-frame fixed inset-0 z-50 flex items-center justify-center bg-black/85"
        >
          <img
            src={images[active]?.src}
            alt={images[active]?.alt ?? ""}
            className="max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-2rem)] max-w-[calc(100vw-var(--safe-left)-var(--safe-right)-2rem)] object-contain"
            onClick={(event) => event.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setActive(null)}
            aria-label="Close"
            className="safe-close-button absolute rounded-full bg-black/60 px-3 py-1 text-sm text-white"
          >
            ×
          </button>
        </div>
      ) : null}
    </>
  );
}
