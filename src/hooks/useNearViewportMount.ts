"use client";

import { useEffect, useState, type RefObject } from "react";

/** Mount heavy below-fold UI only when the anchor nears the scrollport. */
export function useNearViewportMount(
  anchorRef: RefObject<HTMLElement | null>,
  rootRef?: RefObject<HTMLElement | null>,
  rootMargin = "240px 0px",
) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (mounted) return;

    const anchor = anchorRef.current;
    if (!anchor) {
      setMounted(true);
      return;
    }

    const root = rootRef?.current ?? null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setMounted(true);
      },
      { root, rootMargin, threshold: 0 },
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorRef, rootRef, rootMargin, mounted]);

  return mounted;
}
