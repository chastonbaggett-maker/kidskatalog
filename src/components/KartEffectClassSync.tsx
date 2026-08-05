"use client";

import { useEffect } from "react";
import { isKartEffectBlocked } from "@/lib/kart-effect-guard";
import { useKartStore } from "@/lib/kart-store";

/** Sync html.kart-effect-active for CSS containment during add-to-kart (no image hiding). */
export function KartEffectClassSync() {
  useEffect(() => {
    const sync = () => {
      document.documentElement.classList.toggle(
        "kart-effect-active",
        isKartEffectBlocked(),
      );
    };

    sync();
    const unsub = useKartStore.subscribe(sync);

    let quietTimer: number | undefined;
    const scheduleQuietCheck = () => {
      if (quietTimer) window.clearTimeout(quietTimer);
      const { kartQuietUntil } = useKartStore.getState();
      const delay = kartQuietUntil - Date.now();
      if (delay > 0) {
        quietTimer = window.setTimeout(sync, delay + 16);
      }
    };

    const unsubQuiet = useKartStore.subscribe((state, prev) => {
      if (state.kartQuietUntil !== prev.kartQuietUntil) {
        scheduleQuietCheck();
      }
    });

    return () => {
      unsub();
      unsubQuiet();
      if (quietTimer) window.clearTimeout(quietTimer);
      document.documentElement.classList.remove("kart-effect-active");
    };
  }, []);

  return null;
}
