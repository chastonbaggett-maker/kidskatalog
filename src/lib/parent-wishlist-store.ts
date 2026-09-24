"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type ParentWishlistState = {
  ids: string[];
  add: (id: string) => void;
  remove: (id: string) => void;
  importIds: (ids: string[]) => void;
  /** Replace the whole list (used when opening a saved kid list). */
  replaceIds: (ids: string[]) => void;
  clear: () => void;
  has: (id: string) => boolean;
};

export const useParentWishlistStore = create<ParentWishlistState>()(
  persist(
    (set, get) => ({
      ids: [],
      add: (id) =>
        set((s) => (s.ids.includes(id) ? s : { ids: [...s.ids, id] })),
      remove: (id) => set((s) => ({ ids: s.ids.filter((x) => x !== id) })),
      importIds: (incoming) =>
        set((s) => {
          const seen = new Set(s.ids);
          const ids = [...s.ids];
          for (const id of incoming) {
            if (!id || seen.has(id)) continue;
            seen.add(id);
            ids.push(id);
          }
          return { ids };
        }),
      replaceIds: (incoming) => {
        const seen = new Set<string>();
        const ids: string[] = [];
        for (const id of incoming) {
          if (!id || seen.has(id)) continue;
          seen.add(id);
          ids.push(id);
        }
        set({ ids });
      },
      clear: () => set({ ids: [] }),
      has: (id) => get().ids.includes(id),
    }),
    {
      name: "kidskatalog-parent-wishlist",
      partialize: (state) => ({ ids: state.ids }),
    },
  ),
);
