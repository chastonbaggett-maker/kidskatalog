"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

type SiteMusicState = {
  /** When true, gentle bed music plays after unlock. */
  enabled: boolean;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
};

export const useSiteMusicStore = create<SiteMusicState>()(
  persist(
    (set) => ({
      enabled: true,
      setEnabled: (enabled) => set({ enabled }),
      toggle: () => set((s) => ({ enabled: !s.enabled })),
    }),
    { name: "kidskatalog-site-music" },
  ),
);
