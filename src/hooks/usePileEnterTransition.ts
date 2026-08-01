"use client";

import { useEffect, useRef } from "react";
import {
  PILE_CHROME_MS,
  useToyPileModeStore,
} from "@/lib/toy-pile-store";

/** After chrome animation, switch to pile grid with drag explore. */
export function usePileEnterTransition() {
  const enterPhase = useToyPileModeStore((s) => s.enterPhase);
  const setToyPileMode = useToyPileModeStore((s) => s.setToyPileMode);
  const resetTransition = useToyPileModeStore((s) => s.resetTransition);
  const chromeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (enterPhase !== "chrome") return;

    chromeTimerRef.current = window.setTimeout(() => {
      setToyPileMode(true);
      resetTransition();
    }, PILE_CHROME_MS);

    return () => {
      if (chromeTimerRef.current !== null) {
        window.clearTimeout(chromeTimerRef.current);
        chromeTimerRef.current = null;
      }
    };
  }, [enterPhase, resetTransition, setToyPileMode]);
}
