"use client";

import { create } from "zustand";

type CrazyModeState = {
  crazyMode: boolean;
  setCrazyMode: (value: boolean) => void;
  toggleCrazyMode: () => void;
};

/** Session-only — resets on full page load; kept across in-app navigations. */
export const useCrazyModeStore = create<CrazyModeState>((set) => ({
  crazyMode: false,
  setCrazyMode: (crazyMode) => set({ crazyMode }),
  toggleCrazyMode: () => set((s) => ({ crazyMode: !s.crazyMode })),
}));

export function crazyModeRootClass(active: boolean) {
  return active ? "browse-feed--crazy" : "";
}

export function crazyModeScrollClass(active: boolean) {
  return active ? "page-scroll--crazy" : "";
}
