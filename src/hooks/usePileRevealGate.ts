"use client";

import { useEffect, useState } from "react";
import {
  isPileRevealPhase,
  useToyPileModeStore,
} from "@/lib/toy-pile-store";

/**
 * During reveal, keep normal nav + no pile header for one frame after the pile
 * grid mounts, then open the gate so chrome can slide in.
 */
export function usePileRevealGate() {
  const enterPhase = useToyPileModeStore((s) => s.enterPhase);
  const toyPileMode = useToyPileModeStore((s) => s.toyPileMode);
  const [gateOpen, setGateOpen] = useState(false);

  useEffect(() => {
    if (isPileRevealPhase(enterPhase)) {
      setGateOpen(false);
      let innerId = 0;
      const outerId = requestAnimationFrame(() => {
        innerId = requestAnimationFrame(() => setGateOpen(true));
      });
      return () => {
        cancelAnimationFrame(outerId);
        if (innerId) cancelAnimationFrame(innerId);
      };
    }

    setGateOpen(toyPileMode && enterPhase === "idle");
  }, [enterPhase, toyPileMode]);

  return gateOpen;
}
