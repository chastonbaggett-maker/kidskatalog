"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Audience } from "@/types/toy";

type AccentState = {
  audience: Audience;
  setAudience: (value: Audience) => void;
};

export type AccentAttr = "both" | "boys" | "girls";

export const useAccentStore = create<AccentState>()(
  persist(
    (set) => ({
      audience: "all",
      setAudience: (audience) =>
        set((state) => (state.audience === audience ? state : { audience })),
    }),
    {
      name: "kidskatalog-accent",
      partialize: (state) => ({ audience: state.audience }),
    },
  ),
);

export function audienceToAccentAttr(audience: Audience): AccentAttr {
  if (audience === "boys") return "boys";
  if (audience === "girls") return "girls";
  return "both";
}
