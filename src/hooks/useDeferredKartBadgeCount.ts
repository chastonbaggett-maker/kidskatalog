"use client";

import { useEffect, useState } from "react";
import { useKartStore } from "@/lib/kart-store";
import { useKartEffectsReduced } from "@/hooks/useKartEffectsReduced";

/** On touch/iOS, delay badge paint a few frames after count changes to avoid nav repaints during tap. */
export function useDeferredKartBadgeCount() {
  const count = useKartStore((s) => s.ids.length);
  const reduced = useKartEffectsReduced();
  const [displayCount, setDisplayCount] = useState(count);

  useEffect(() => {
    if (!reduced) {
      setDisplayCount(count);
      return;
    }

    let cancelled = false;
    let frames = 0;
    let raf = 0;

    const step = () => {
      frames += 1;
      if (frames >= 3) {
        if (!cancelled) setDisplayCount(count);
        return;
      }
      raf = requestAnimationFrame(step);
    };

    raf = requestAnimationFrame(step);
    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
    };
  }, [count, reduced]);

  return reduced ? displayCount : count;
}
