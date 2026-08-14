"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ClickMelodyState = {
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
};

export const useClickMelodyStore = create<ClickMelodyState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    { name: "kidskatalog-click-melody" },
  ),
);
