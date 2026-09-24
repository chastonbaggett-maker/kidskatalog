"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/pile-transition-utils";

/**
 * Two-frame shelf reveal so the pending (translated-down) pose paints
 * before ease-in-out slides the lift up. Returns:
 * - ready: transition is armed (after the pending pose has painted)
 * - visible: enter-visible / slide-up target
 */
export function useShelfRaiseReveal(active: boolean): {
  ready: boolean;
  visible: boolean;
} {
  const [ready, setReady] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      // Keep transition armed through the slide-down, then clear.
      const clearId = window.setTimeout(() => setReady(false), 420);
      return () => window.clearTimeout(clearId);
    }

    if (prefersReducedMotion()) {
      setReady(true);
      setVisible(true);
      return;
    }

    setReady(false);
    setVisible(false);

    let innerId = 0;
    let showId = 0;
    const outerId = requestAnimationFrame(() => {
      // Pending pose is in the DOM — force layout, arm transition, then slide.
      innerId = requestAnimationFrame(() => {
        setReady(true);
        showId = window.setTimeout(() => setVisible(true), 32);
      });
    });

    return () => {
      cancelAnimationFrame(outerId);
      if (innerId) cancelAnimationFrame(innerId);
      if (showId) window.clearTimeout(showId);
    };
  }, [active]);

  return { ready, visible };
}
