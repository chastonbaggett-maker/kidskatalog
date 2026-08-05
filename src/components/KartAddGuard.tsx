"use client";

import { useEffect } from "react";
import { useKartStore } from "@/lib/kart-store";

/**
 * During add-to-kart only (never remove), suppress toy photo repaints that can
 * flash fullscreen when the fly-ball lands and the nav badge bounces.
 */
export function KartAddGuard() {
  useEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      const { flyBall, kartAddActive } = useKartStore.getState();
      root.classList.toggle("kart-add-active", flyBall != null || kartAddActive > 0);
    };

    sync();
    return useKartStore.subscribe(sync);
  }, []);

  return null;
}
