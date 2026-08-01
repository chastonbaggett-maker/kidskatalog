"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PileEnterPhase = "idle" | "chrome";

type ToyPileModeState = {
  toyPileMode: boolean;
  enterPhase: PileEnterPhase;
  setToyPileMode: (value: boolean) => void;
  toggleToyPileMode: () => void;
  startEnterTransition: () => void;
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

export function isPileEntering(phase: PileEnterPhase) {
  return phase === "chrome";
}

export const PILE_FILTER_PORTAL_ID = "pile-filter-portal";
