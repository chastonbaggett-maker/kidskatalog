"use client";

import { useEffect, useRef } from "react";
import {
  PILE_CHROME_MS,
  useToyPileModeStore,
} from "@/lib/toy-pile-store";

/** Chain chrome → zoom phase timers after enter transition starts. */
export function usePileEnterTransition() {
  const enterPhase = useToyPileModeStore((s) => s.enterPhase);
  const advanceEnterPhase = useToyPileModeStore((s) => s.advanceEnterPhase);
  const setToyPileMode = useToyPileModeStore((s) => s.setToyPileMode);
  const chromeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (enterPhase !== "chrome") return;

    chromeTimerRef.current = window.setTimeout(() => {
      setToyPileMode(true);
      advanceEnterPhase("center");
    }, PILE_CHROME_MS);

    return () => {
      if (chromeTimerRef.current !== null) {
        window.clearTimeout(chromeTimerRef.current);
        chromeTimerRef.current = null;
      }
    };
  }, [enterPhase, advanceEnterPhase, setToyPileMode]);
}
