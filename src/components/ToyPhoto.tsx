"use client";

import { useCallback, useLayoutEffect, useRef, useState, type ImgHTMLAttributes } from "react";

/** Toy catalog photo — clipped by its container; fades in once decoded. */
export function ToyPhoto({
  src,
  onLoad,
  className,
  style,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);
  const readySrcRef = useRef<string | null>(null);
  const [ready, setReady] = useState(false);

  const markReady = useCallback((nextSrc: string) => {
    readySrcRef.current = nextSrc;
    setReady(true);
  }, []);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof src !== "string") return;

    if (readySrcRef.current === src && el.complete && el.naturalWidth > 0) {
      setReady(true);
      return;
    }

    readySrcRef.current = null;
    setReady(false);

    if (el.complete && el.naturalWidth > 0) {
      markReady(src);
    }
  }, [src, markReady]);

  return (
    <img
      ref={ref}
      src={src}
      className={className}
      style={{
        ...style,
        opacity: ready ? 1 : 0,
        transition: ready ? "opacity 120ms ease-out" : undefined,
      }}
      {...props}
      onLoad={(event) => {
        if (typeof src === "string") markReady(src);
        onLoad?.(event);
      }}
    />
  );
}
