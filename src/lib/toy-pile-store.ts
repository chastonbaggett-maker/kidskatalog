"use client";

import { create } from "zustand";

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

/** Session-only — resets on full page load; kept across in-app navigations. */
export const useToyPileModeStore = create<ToyPileModeState>((set) => ({
  toyPileMode: false,
  enterPhase: "idle",
  setToyPileMode: (toyPileMode) => set({ toyPileMode }),
  toggleToyPileMode: () => set((s) => ({ toyPileMode: !s.toyPileMode })),
  startEnterTransition: () => set({ enterPhase: "chrome" }),
  advanceToRevealPhase: () =>
    set({ toyPileMode: true, enterPhase: "reveal" }),
  resetTransition: () => set({ enterPhase: "idle" }),
  skipToPileResting: () => set({ toyPileMode: true, enterPhase: "idle" }),
}));

export function toyPileRootClass(active: boolean) {
  return active ? "browse-feed--toy-pile" : "";
}

/** Routes where the pile grid and extended bottom nav shelf are shown. */
export function isPileBrowseRoute(pathname: string) {
  return pathname === "/shop" || pathname.startsWith("/shop/");
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
