"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
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
  const activeImage = active === null ? null : images[active] ?? null;

  function showPrevious() {
    setActive((currentIndex) => (currentIndex === null ? null : (currentIndex - 1 + images.length) % images.length));
  }

  function showNext() {
    setActive((currentIndex) => (currentIndex === null ? null : (currentIndex + 1) % images.length));
  }

  useEffect(() => {
    if (active === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") showNext();
      if (event.key === "ArrowLeft") showPrevious();
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
    container = <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">{list}</div>;
  }

  return (
    <>
      {container}
      {lightbox && active !== null && activeImage ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Gallery image carousel"
          onClick={() => setActive(null)}
          className="safe-modal-frame fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-black/90 px-4 py-6 text-white"
        >
          <div className="pointer-events-none absolute inset-x-0 top-[calc(var(--safe-top)+0.75rem)] flex items-center justify-between px-[calc(var(--safe-left)+1rem)] pr-[calc(var(--safe-right)+1rem)]">
            <p className="rounded-full bg-black/60 px-3 py-1 text-xs font-medium tabular-nums text-white/85">
              {active + 1} / {images.length}
            </p>
          </div>
          <div className="relative flex min-h-0 w-full flex-1 items-center justify-center" onClick={(event) => event.stopPropagation()}>
            {images.length > 1 ? (
              <button
                type="button"
                onClick={showPrevious}
                aria-label="Previous image"
                className="absolute left-0 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white ring-1 ring-white/20 transition hover:bg-black/80 sm:left-4"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
            ) : null}
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-8rem)] max-w-[calc(100vw-var(--safe-left)-var(--safe-right)-2rem)] object-contain"
            />
            {images.length > 1 ? (
              <button
                type="button"
                onClick={showNext}
                aria-label="Next image"
                className="absolute right-0 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white ring-1 ring-white/20 transition hover:bg-black/80 sm:right-4"
              >
                <ChevronRight className="size-6" aria-hidden />
              </button>
            ) : null}
          </div>
          {images.length > 1 ? (
            <div className="flex max-w-full gap-2 overflow-x-auto px-1 pb-1" onClick={(event) => event.stopPropagation()}>
              {images.map((image, index) => (
                <button
                  key={`${image.src}-${index}`}
                  type="button"
                  onClick={() => setActive(index)}
                  aria-label={`Open image ${index + 1}`}
                  aria-current={index === active ? "true" : undefined}
                  className={[
                    "size-14 shrink-0 overflow-hidden rounded-card ring-2 transition",
                    index === active ? "ring-[var(--vc-accent,#d4af37)]" : "ring-white/20",
                  ].join(" ")}
                >
                  <img src={image.src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => setActive(null)}
            aria-label="Close"
            className="safe-close-button absolute flex size-10 items-center justify-center rounded-full bg-black/65 text-white ring-1 ring-white/20 transition hover:bg-black/80"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
      ) : null}
    </>
  );
}
