"use client";

import { useEffect, useRef } from "react";
import {
  PILE_CHROME_MS,
  isPileChromePhase,
  isPileRevealPhase,
  useToyPileModeStore,
} from "@/lib/toy-pile-store";

/** Chrome exit → load pile grid → reveal pile header + nav shelf. */
export function usePileEnterTransition() {
  const enterPhase = useToyPileModeStore((s) => s.enterPhase);
  const advanceToRevealPhase = useToyPileModeStore((s) => s.advanceToRevealPhase);
  const resetTransition = useToyPileModeStore((s) => s.resetTransition);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isPileChromePhase(enterPhase) && !isPileRevealPhase(enterPhase)) return;

    const ms = PILE_CHROME_MS;
    timerRef.current = window.setTimeout(() => {
      if (isPileChromePhase(useToyPileModeStore.getState().enterPhase)) {
        advanceToRevealPhase();
        return;
      }
      resetTransition();
    }, ms);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [enterPhase, advanceToRevealPhase, resetTransition]);
}
