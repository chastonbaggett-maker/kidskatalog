"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "@/lib/pile-transition-utils";

/** Fade/slide the raised bottom shelf in after layout mounts (compact browse or pile). */
export function useShelfRaiseReveal(active: boolean) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    if (prefersReducedMotion()) {
      setVisible(true);
      return;
    }

    setVisible(false);
    let innerId = 0;
    const outerId = requestAnimationFrame(() => {
      innerId = requestAnimationFrame(() => {
        setVisible(true);
      });
    });

    return () => {
      cancelAnimationFrame(outerId);
      if (innerId) cancelAnimationFrame(innerId);
    };
  }, [active]);

  return visible;
}
