"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/pile-transition-utils";
import {
  isPileRevealPhase,
  useToyPileModeStore,
} from "@/lib/toy-pile-store";

function scheduleReveal(setVisible: (value: boolean) => void, playedRef: { current: boolean }) {
  setVisible(false);
  if (prefersReducedMotion()) {
    setVisible(true);
    playedRef.current = true;
    return () => {};
  }

  let innerId = 0;
  const outerId = requestAnimationFrame(() => {
    innerId = requestAnimationFrame(() => {
      setVisible(true);
      playedRef.current = true;
    });
  });

  return () => {
    cancelAnimationFrame(outerId);
    if (innerId) cancelAnimationFrame(innerId);
  };
}

/** Slide-reveal pile chrome (header down / bottom nav up) once per enter or page load. */
export function usePileEnterReveal(active: boolean) {
  const enterPhase = useToyPileModeStore((s) => s.enterPhase);
  const toyPileMode = useToyPileModeStore((s) => s.toyPileMode);
  const [visible, setVisible] = useState(false);
  const playedRef = useRef(false);

  useEffect(() => {
    if (!toyPileMode && enterPhase === "idle") {
      playedRef.current = false;
    }
  }, [toyPileMode, enterPhase]);

  useEffect(() => {
    if (!active) {
      setVisible(false);
      return;
    }

    if (isPileRevealPhase(enterPhase)) {
      return scheduleReveal(setVisible, playedRef);
    }

    if (toyPileMode && !playedRef.current) {
      return scheduleReveal(setVisible, playedRef);
    }

    if (toyPileMode) {
      setVisible(true);
      return;
    }

    setVisible(false);
  }, [active, enterPhase, toyPileMode]);

  return visible;
}
