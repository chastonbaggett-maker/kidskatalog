"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type PileEnterPhase = "idle" | "chrome" | "zoom" | "done";

export type PileAnchorRect = {
  left: number;
  top: number;
  width: number;
  height: number;
};

export type PileAnchor = {
  slotIndex: number;
  toyId: string;
  rect: PileAnchorRect;
};

type ToyPileModeState = {
  toyPileMode: boolean;
  enterPhase: PileEnterPhase;
  anchor: PileAnchor | null;
  setToyPileMode: (value: boolean) => void;
  toggleToyPileMode: () => void;
  startEnterTransition: (anchor: PileAnchor) => void;
  advanceEnterPhase: (phase: PileEnterPhase) => void;
  resetTransition: () => void;
  skipToPileResting: () => void;
};

export const PILE_CHROME_MS = 680;
export const PILE_CHROME_EASE = "ease-in-out";
export const PILE_ZOOM_MS = 650;

export const useToyPileModeStore = create<ToyPileModeState>()(
  persist(
    (set) => ({
      toyPileMode: false,
      enterPhase: "idle",
      anchor: null,
      setToyPileMode: (toyPileMode) => set({ toyPileMode }),
      toggleToyPileMode: () => set((s) => ({ toyPileMode: !s.toyPileMode })),
      startEnterTransition: (anchor) =>
        set({ enterPhase: "chrome", anchor }),
      advanceEnterPhase: (enterPhase) => set({ enterPhase }),
      resetTransition: () => set({ enterPhase: "idle", anchor: null }),
      skipToPileResting: () =>
        set({ toyPileMode: true, enterPhase: "idle", anchor: null }),
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
  return phase === "chrome" || phase === "zoom";
}

export const PILE_FILTER_PORTAL_ID = "pile-filter-portal";
