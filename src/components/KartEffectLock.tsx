"use client";

import { useEffect } from "react";
import { useKartStore } from "@/lib/kart-store";

/** Hide toy photos while a kart add fly-ball or settle window is active. */
export function KartEffectLock() {
  useEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      const { flyBall, kartAddActive } = useKartStore.getState();
      root.classList.toggle("kart-effect-active", flyBall != null || kartAddActive > 0);
    };

    sync();
    return useKartStore.subscribe(sync);
  }, []);

  return null;
}
