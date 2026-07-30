"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Audience } from "@/types/toy";

type AccentState = {
  audience: Audience;
  setAudience: (value: Audience) => void;
};

export const useAccentStore = create<AccentState>()(
  persist(
    (set) => ({
      audience: "all",
      setAudience: (audience) => set({ audience }),
    }),
    { name: "kidskatalog-accent" },
  ),
);

export function audienceToAccentAttr(audience: Audience): "both" | "boys" | "girls" {
  if (audience === "boys") return "boys";
  if (audience === "girls") return "girls";
  return "both";
}
