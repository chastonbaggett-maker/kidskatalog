"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type KartState = {
  ids: string[];
  kartBounceToken: number;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  pulseKartNav: () => void;
};

export const useKartStore = create<KartState>()(
  persist(
    (set, get) => ({
      ids: [],
      kartBounceToken: 0,
      add: (id) =>
        set((s) => (s.ids.includes(id) ? s : { ids: [...s.ids, id] })),
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      toggle: (id) => {
        const { ids } = get();
        if (ids.includes(id)) {
          set({ ids: ids.filter((x) => x !== id) });
        } else {
          set({ ids: [...ids, id] });
        }
      },
      clear: () => set({ ids: [] }),
      has: (id) => get().ids.includes(id),
      pulseKartNav: () =>
        set((s) => ({ kartBounceToken: s.kartBounceToken + 1 })),
    }),
    { name: "kidskatalog-kart" },
  ),
);
