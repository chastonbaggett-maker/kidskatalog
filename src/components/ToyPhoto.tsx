"use client";

import { useEffect, useState, type CSSProperties } from "react";

type ToyPhotoProps = {
  src?: string;
  alt?: string;
  className?: string;
  style?: CSSProperties;
  loading?: "lazy" | "eager";
  decoding?: "async" | "sync" | "auto";
  width?: number;
  height?: number;
  draggable?: boolean;
  fetchPriority?: "high" | "low" | "auto";
};

/** Clipped surfaces use background-image so iOS cannot paint the bitmap fullscreen. */
const BG_SURFACE =
  /(?:^|\s)(feed-card__photo|product-gallery__photo|product-gallery__thumb)(?:\s|$)/;

export function ToyPhoto({
  src,
  alt,
  className = "",
  style,
}: ToyPhotoProps) {
  const nextSrc = typeof src === "string" ? src : "";
  const [displaySrc, setDisplaySrc] = useState(nextSrc);

  useEffect(() => {
    if (!nextSrc || nextSrc === displaySrc) return;

    let cancelled = false;
    const img = new window.Image();
    const commit = () => {
      if (!cancelled) setDisplaySrc(nextSrc);
    };

    img.onload = commit;
    img.onerror = commit;
    img.src = nextSrc;
    if (img.complete) commit();

    return () => {
      cancelled = true;
    };
  }, [nextSrc, displaySrc]);

  const resolved = displaySrc || nextSrc;

  if (BG_SURFACE.test(className)) {
    return (
      <div
        role="img"
        aria-label={alt ?? ""}
        className={className}
        style={{
          ...style,
          backgroundImage: resolved ? `url("${resolved}")` : undefined,
        }}
      />
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      className={className}
      style={style}
      decoding="async"
    />
  );
}
