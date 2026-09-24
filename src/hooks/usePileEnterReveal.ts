"use client";

import { useEffect, useRef, useState } from "react";
import { prefersReducedMotion } from "@/lib/pile-transition-utils";
import {
  isPileRevealPhase,
  useToyPileModeStore,
} from "@/lib/toy-pile-store";

type RevealState = { ready: boolean; visible: boolean };

function scheduleReveal(
  setState: (value: RevealState | ((prev: RevealState) => RevealState)) => void,
  playedRef: { current: boolean },
) {
  setState({ ready: false, visible: false });
  if (prefersReducedMotion()) {
    setState({ ready: true, visible: true });
    playedRef.current = true;
    return () => {};
  }

  let innerId = 0;
  let showId = 0;
  const outerId = requestAnimationFrame(() => {
    innerId = requestAnimationFrame(() => {
      setState({ ready: true, visible: false });
      showId = window.setTimeout(() => {
        setState({ ready: true, visible: true });
        playedRef.current = true;
      }, 32);
    });
  });

  return () => {
    cancelAnimationFrame(outerId);
    if (innerId) cancelAnimationFrame(innerId);
    if (showId) window.clearTimeout(showId);
  };
}

/** Slide-reveal pile chrome (header down / bottom nav up) once per enter or page load. */
export function usePileEnterReveal(active: boolean): RevealState {
  const enterPhase = useToyPileModeStore((s) => s.enterPhase);
  const toyPileMode = useToyPileModeStore((s) => s.toyPileMode);
  const [state, setState] = useState<RevealState>({
    ready: false,
    visible: false,
  });
  const playedRef = useRef(false);

  useEffect(() => {
    if (!toyPileMode && enterPhase === "idle") {
      playedRef.current = false;
    }
  }, [toyPileMode, enterPhase]);

  useEffect(() => {
    if (!active) {
      setState((prev) => ({ ready: prev.ready, visible: false }));
      const clearId = window.setTimeout(
        () => setState({ ready: false, visible: false }),
        420,
      );
      return () => window.clearTimeout(clearId);
    }

    if (isPileRevealPhase(enterPhase)) {
      return scheduleReveal(setState, playedRef);
    }

    if (toyPileMode && !playedRef.current) {
      return scheduleReveal(setState, playedRef);
    }

    if (toyPileMode) {
      setState({ ready: true, visible: true });
      return;
    }

    setState({ ready: false, visible: false });
  }, [active, enterPhase, toyPileMode]);

  return state;
}
