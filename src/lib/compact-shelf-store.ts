"use client";

import { create } from "zustand";

type CompactShelfState = {
  /** True while the scrolled-away browse header overlay is showing. */
  raised: boolean;
  setRaised: (raised: boolean) => void;
};

/** Lets BottomNav raise the pile-style shelf when the compact browse header slides in. */
export const useCompactShelfStore = create<CompactShelfState>((set) => ({
  raised: false,
  setRaised: (raised) => set({ raised }),
}));
