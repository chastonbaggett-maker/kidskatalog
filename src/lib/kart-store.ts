"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { syncKartBootDataset } from "@/lib/kart-boot";

type KartState = {
  ids: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
};

export const useKartStore = create<KartState>()(
  persist(
    (set, get) => ({
      ids: [],
      add: (id) =>
        set((s) => {
          if (s.ids.includes(id)) return s;
          const ids = [...s.ids, id];
          syncKartBootDataset(ids);
          return { ids };
        }),
      remove: (id) =>
        set((s) => {
          const ids = s.ids.filter((x) => x !== id);
          syncKartBootDataset(ids);
          return { ids };
        }),
      toggle: (id) => {
        const { ids } = get();
        if (ids.includes(id)) {
          const next = ids.filter((x) => x !== id);
          syncKartBootDataset(next);
          set({ ids: next });
        } else {
          const next = [...ids, id];
          syncKartBootDataset(next);
          set({ ids: next });
        }
      },
      clear: () => {
        syncKartBootDataset([]);
        set({ ids: [] });
      },
      has: (id) => get().ids.includes(id),
    }),
    {
      name: "kidskatalog-kart",
      partialize: (state) => ({ ids: state.ids }),
    },
  ),
);
