"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ToyPileModeState = {
  toyPileMode: boolean;
  setToyPileMode: (value: boolean) => void;
  toggleToyPileMode: () => void;
};

export const useToyPileModeStore = create<ToyPileModeState>()(
  persist(
    (set) => ({
      toyPileMode: false,
      setToyPileMode: (toyPileMode) => set({ toyPileMode }),
      toggleToyPileMode: () => set((s) => ({ toyPileMode: !s.toyPileMode })),
    }),
    { name: "kidskatalog-toy-pile-mode" },
  ),
);

export function toyPileRootClass(active: boolean) {
  return active ? "browse-feed--toy-pile" : "";
}
