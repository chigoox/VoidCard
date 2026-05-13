"use client";

import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";

export type GalleryImage = { src: string; alt: string; category?: string };
export type GalleryLayout = "grid" | "masonry" | "carousel";

const SWIPE_DISTANCE_PX = 48;
const SWIPE_AXIS_RATIO = 1.25;
const CAROUSEL_SLIDE_CLASS = "aspect-[4/5] flex-none overflow-hidden snap-center snap-always";

function preloadImageSrc(src: string, onReady: (src: string) => void) {
  const image = new Image();
  let settled = false;
  const finish = () => {
    if (settled) return;
    settled = true;
    onReady(src);
  };
  image.decoding = "async";
  image.onload = finish;
  image.onerror = finish;
  image.src = src;
  if (image.complete) finish();
  else void image.decode?.().then(finish).catch(() => undefined);
}

export function GallerySectionClient({
  images,
  layout,
  lightbox,
  carouselFullWidth,
  radius,
}: {
  images: GalleryImage[];
  layout: GalleryLayout;
  lightbox: boolean;
  carouselFullWidth: boolean;
  filters: string[];
  showCategoryStories: boolean;
  radius: string;
}) {
  const [active, setActive] = useState<number | null>(null);
  const [readySources, setReadySources] = useState<ReadonlySet<string>>(() => new Set());
  const swipeRef = useRef<{ pointerId: number; startX: number; startY: number; lastX: number; lastY: number } | null>(null);
  const activeImage = active === null ? null : images[active] ?? null;
  const activeReady = activeImage === null || readySources.has(activeImage.src);

  const markImageReady = useCallback((src: string) => {
    setReadySources((current) => {
      if (current.has(src)) return current;
      const next = new Set(current);
      next.add(src);
      return next;
    });
  }, []);

  const showPrevious = useCallback(() => {
    setActive((currentIndex) => (currentIndex === null || images.length === 0 ? currentIndex : (currentIndex - 1 + images.length) % images.length));
  }, [images.length]);

  const showNext = useCallback(() => {
    setActive((currentIndex) => (currentIndex === null || images.length === 0 ? currentIndex : (currentIndex + 1) % images.length));
  }, [images.length]);

  const openLightbox = useCallback((index: number) => {
    const image = images[index];
    if (!image) return;
    preloadImageSrc(image.src, markImageReady);
    setActive(index);
  }, [images, markImageReady]);

  useEffect(() => {
    if (active === null) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null);
      if (event.key === "ArrowRight") showNext();
      if (event.key === "ArrowLeft") showPrevious();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, images.length, showNext, showPrevious]);

  useEffect(() => {
    if (active === null) return;
    const nearbyIndexes = images.length > 1 ? [active, (active + 1) % images.length, (active - 1 + images.length) % images.length] : [active];
    let mounted = true;
    for (const index of nearbyIndexes) {
      const image = images[index];
      if (image) preloadImageSrc(image.src, (src) => {
        if (mounted) markImageReady(src);
      });
    }
    return () => {
      mounted = false;
    };
  }, [active, images, images.length, markImageReady]);

  useEffect(() => {
    if (active !== null && !images[active]) setActive(null);
  }, [active, images]);

  function handleSwipeStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (images.length < 2) return;
    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSwipeMove(event: ReactPointerEvent<HTMLDivElement>) {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    swipe.lastX = event.clientX;
    swipe.lastY = event.clientY;
  }

  function handleSwipeEnd(event: ReactPointerEvent<HTMLDivElement>) {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    swipeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);

    const deltaX = swipe.lastX - swipe.startX;
    const deltaY = swipe.lastY - swipe.startY;
    const isHorizontalSwipe = Math.abs(deltaX) >= SWIPE_DISTANCE_PX && Math.abs(deltaX) > Math.abs(deltaY) * SWIPE_AXIS_RATIO;
    if (!isHorizontalSwipe) return;
    if (deltaX < 0) showNext();
    else showPrevious();
  }

  function handleSwipeCancel(event: ReactPointerEvent<HTMLDivElement>) {
    const swipe = swipeRef.current;
    if (!swipe || swipe.pointerId !== event.pointerId) return;
    swipeRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  }

  const itemStyle: CSSProperties = { borderRadius: radius };

  function Tile({ image, index, className, style }: { image: GalleryImage; index: number; className: string; style?: CSSProperties }) {
    return (
      <button
        type="button"
        onClick={lightbox ? () => openLightbox(index) : undefined}
        onFocus={lightbox ? () => preloadImageSrc(image.src, markImageReady) : undefined}
        onPointerEnter={lightbox ? () => preloadImageSrc(image.src, markImageReady) : undefined}
        className={`block ${className}`}
        style={{ cursor: lightbox ? "zoom-in" : "default", padding: 0, border: 0, background: "transparent" }}
        aria-label={image.alt || `Image ${index + 1}`}
      >
        <img src={image.src} alt={image.alt} loading={index < 4 ? "eager" : "lazy"} decoding="async" className="block h-full w-full object-cover" style={{ ...itemStyle, ...style }} onLoad={() => markImageReady(image.src)} />
      </button>
    );
  }

  const list = images.map((image, index) => {
    if (layout === "carousel") {
      return <Tile key={index} image={image} index={index} className={carouselFullWidth ? `${CAROUSEL_SLIDE_CLASS} w-full basis-full` : `${CAROUSEL_SLIDE_CLASS} w-[88%] basis-[88%]`} />;
    }
    if (layout === "masonry") {
      return (
        <div key={index} className="break-inside-avoid sm:mb-2">
          <Tile image={image} index={index} className="aspect-square w-full sm:aspect-auto" />
        </div>
      );
    }
    return <Tile key={index} image={image} index={index} className="aspect-square w-full" />;
  });

  let container: ReactNode;
  if (layout === "carousel") {
    container = (
      <div className={["flex w-full snap-x snap-mandatory gap-2 overflow-x-auto overscroll-x-contain scroll-smooth", carouselFullWidth ? "-mx-4 sm:-mx-6" : ""].join(" ").trim()} style={{ scrollPaddingLeft: carouselFullWidth ? 0 : 8 }}>
        {list}
      </div>
    );
  } else if (layout === "masonry") {
    container = <div className="grid grid-cols-2 gap-2 sm:block sm:columns-3 sm:gap-2">{list}</div>;
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
          <div
            className="relative flex min-h-0 w-full flex-1 cursor-grab touch-none select-none items-center justify-center active:cursor-grabbing"
            onClick={(event) => event.stopPropagation()}
            onPointerDown={handleSwipeStart}
            onPointerMove={handleSwipeMove}
            onPointerUp={handleSwipeEnd}
            onPointerCancel={handleSwipeCancel}
            style={{ touchAction: "none" }}
          >
            {images.length > 1 ? (
              <button
                type="button"
                onClick={showPrevious}
                onPointerDown={(event) => event.stopPropagation()}
                aria-label="Previous image"
                className="absolute left-0 top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/65 text-white ring-1 ring-white/20 transition hover:bg-black/80 sm:left-4"
              >
                <ChevronLeft className="size-6" aria-hidden />
              </button>
            ) : null}
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              loading="eager"
              decoding="async"
              draggable={false}
              onLoad={() => markImageReady(activeImage.src)}
              onDragStart={(event) => event.preventDefault()}
              className={["max-h-[calc(100dvh-var(--safe-top)-var(--safe-bottom)-8rem)] max-w-[calc(100vw-var(--safe-left)-var(--safe-right)-2rem)] object-contain transition-opacity duration-150", activeReady ? "opacity-100" : "opacity-0"].join(" ")}
            />
            {!activeReady ? (
              <div className="absolute inset-0 flex items-center justify-center" aria-label="Loading image" role="status">
                <span className="size-9 animate-pulse rounded-full ring-2 ring-white/30 ring-offset-4 ring-offset-black/40" />
              </div>
            ) : null}
            {images.length > 1 ? (
              <button
                type="button"
                onClick={showNext}
                onPointerDown={(event) => event.stopPropagation()}
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
                  <img src={image.src} alt="" loading={index < 4 ? "eager" : "lazy"} decoding="async" className="h-full w-full object-cover" onLoad={() => markImageReady(image.src)} />
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
