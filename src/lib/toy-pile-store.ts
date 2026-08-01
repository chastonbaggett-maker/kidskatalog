"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PileEnterPhase = "idle" | "chrome" | "reveal";

type ToyPileModeState = {
  toyPileMode: boolean;
  enterPhase: PileEnterPhase;
  setToyPileMode: (value: boolean) => void;
  toggleToyPileMode: () => void;
  startEnterTransition: () => void;
  advanceToRevealPhase: () => void;
  resetTransition: () => void;
  skipToPileResting: () => void;
};

export const PILE_CHROME_MS = 680;
export const PILE_CHROME_EASE = "ease-in-out";

export const useToyPileModeStore = create<ToyPileModeState>()(
  persist(
    (set) => ({
      toyPileMode: false,
      enterPhase: "idle",
      setToyPileMode: (toyPileMode) => set({ toyPileMode }),
      toggleToyPileMode: () => set((s) => ({ toyPileMode: !s.toyPileMode })),
      startEnterTransition: () => set({ enterPhase: "chrome" }),
      advanceToRevealPhase: () =>
        set({ toyPileMode: true, enterPhase: "reveal" }),
      resetTransition: () => set({ enterPhase: "idle" }),
      skipToPileResting: () =>
        set({ toyPileMode: true, enterPhase: "idle" }),
    }),
    {
      name: "kidskatalog-toy-pile-mode",
      partialize: (state) => ({ toyPileMode: state.toyPileMode }),
    },
  ),
);

export function toyPileRootClass(active: boolean) {
  return active ? "browse-feed--toy-pile" : "";
}

/** Feed chrome exit: header closes, cards fade — normal nav, no pile header. */
export function isPileChromePhase(phase: PileEnterPhase) {
  return phase === "chrome";
}

/** Pile grid loaded; pile header + nav shelf slide in together. */
export function isPileRevealPhase(phase: PileEnterPhase) {
  return phase === "reveal";
}

export function isPileTransitioning(phase: PileEnterPhase) {
  return phase !== "idle";
}

/** @deprecated Use isPileChromePhase */
export function isPileEntering(phase: PileEnterPhase) {
  return isPileChromePhase(phase);
}
