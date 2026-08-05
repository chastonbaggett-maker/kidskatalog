"use client";

import { useEffect, useState, type ImgHTMLAttributes } from "react";

/**
 * Clipped catalog photo — sizing/overflow is enforced in CSS on the container +
 * photo class. Swaps src only after the next image is decoded to avoid flashes.
 */
export function ToyPhoto({
  src,
  alt,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const nextSrc = typeof src === "string" ? src : "";
  const [displaySrc, setDisplaySrc] = useState(nextSrc);

  useEffect(() => {
    if (!nextSrc || nextSrc === displaySrc) return;

    let cancelled = false;
    const img = new window.Image();
    img.decoding = "async";

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

  return <img {...props} src={displaySrc || nextSrc} alt={alt} />;
}
