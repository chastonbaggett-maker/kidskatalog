"use client";

import { useLayoutEffect, useRef, type ImgHTMLAttributes } from "react";

/** Toy catalog photo — stays hidden until loaded so intrinsic size cannot flash fullscreen. */
export function ToyPhoto({
  src,
  onLoad,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null);

  const markReady = () => {
    const el = ref.current;
    if (el) el.dataset.ready = "true";
  };

  useLayoutEffect(() => {
    const el = ref.current;
    if (el?.complete && el.naturalWidth > 0) markReady();
  }, [src]);

  return (
    <img
      ref={ref}
      src={src}
      {...props}
      onLoad={(event) => {
        markReady();
        onLoad?.(event);
      }}
    />
  );
}
