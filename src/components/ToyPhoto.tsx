"use client";

import { useLayoutEffect, useRef, useState, type ImgHTMLAttributes } from "react";

/** Toy catalog photo — clipped by its container; fades in once decoded. */
export function ToyPhoto({
  src,
  onLoad,
  className,
  style,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);

  useLayoutEffect(() => {
    setReady(false);
    const el = ref.current;
    if (el?.complete && el.naturalWidth > 0) {
      setReady(true);
    }
  }, [src]);

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
        setReady(true);
        onLoad?.(event);
      }}
    />
  );
}
