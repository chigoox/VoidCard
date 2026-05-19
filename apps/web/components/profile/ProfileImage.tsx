/* eslint-disable @next/next/no-img-element -- Profile owners can provide external image URLs outside configured Next image hosts. */
import type { CSSProperties, DragEvent } from "react";
import Image from "next/image";

const BUNNY_CDN_HOST = process.env.NEXT_PUBLIC_BUNNY_CDN_HOST ?? "cdn.vcard.ed5enterprise.com";

function canUseNextImage(src: string) {
  if (src.startsWith("/")) return true;
  try {
    const url = new URL(src);
    if (url.protocol !== "https:") return false;
    return (
      url.hostname.endsWith(".supabase.co") ||
      url.hostname === "vcard.ed5enterprise.com" ||
      url.hostname === BUNNY_CDN_HOST ||
      url.hostname === "lh3.googleusercontent.com" ||
      url.hostname === "avatars.githubusercontent.com"
    );
  } catch {
    return false;
  }
}

export function ProfileImage({
  src,
  alt,
  className,
  style,
  sizes,
  priority,
  fill,
  width,
  height,
  draggable,
  onLoad,
  onDragStart,
}: {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  sizes?: string;
  priority?: boolean;
  fill?: boolean;
  width?: number;
  height?: number;
  draggable?: boolean;
  onLoad?: () => void;
  onDragStart?: (event: DragEvent<HTMLImageElement>) => void;
}) {
  if (canUseNextImage(src)) {
    if (fill) {
      return (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={className}
          style={style}
          draggable={draggable}
          onLoad={onLoad}
          onDragStart={onDragStart}
        />
      );
    }
    return (
      <Image
        src={src}
        alt={alt}
        width={width ?? 1200}
        height={height ?? 800}
        sizes={sizes}
        priority={priority}
        className={className}
        style={style}
        draggable={draggable}
        onLoad={onLoad}
        onDragStart={onDragStart}
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      draggable={draggable}
      className={className}
      style={style}
      onLoad={onLoad}
      onDragStart={onDragStart}
    />
  );
}