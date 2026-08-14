"use client";

import { create } from "zustand";
import type { Audience } from "@/types/toy";

type AccentState = {
  audience: Audience;
  setAudience: (value: Audience) => void;
};

export type AccentAttr = "both" | "boys" | "girls";

/** Session-only — always starts unisex on full page load. */
export const useAccentStore = create<AccentState>((set) => ({
  audience: "all",
  setAudience: (audience) =>
    set((state) => (state.audience === audience ? state : { audience })),
}));

export function audienceToAccentAttr(audience: Audience): AccentAttr {
  if (audience === "boys") return "boys";
  if (audience === "girls") return "girls";
  return "both";
}
