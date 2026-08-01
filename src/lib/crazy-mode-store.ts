"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type CrazyModeState = {
  crazyMode: boolean;
  setCrazyMode: (value: boolean) => void;
  toggleCrazyMode: () => void;
};

export const useCrazyModeStore = create<CrazyModeState>()(
  persist(
    (set) => ({
      crazyMode: false,
      setCrazyMode: (crazyMode) => set({ crazyMode }),
      toggleCrazyMode: () => set((s) => ({ crazyMode: !s.crazyMode })),
    }),
    { name: "kidskatalog-crazy-mode" },
  ),
);

export function crazyModeRootClass(active: boolean) {
  return active ? "browse-feed--crazy" : "";
}

export function crazyModeScrollClass(active: boolean) {
  return active ? "page-scroll--crazy" : "";
}
