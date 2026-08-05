"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type KartFlyBallFlight = {
  fromX: number;
  fromY: number;
  vx: number;
  vy: number;
  toX: number;
  toY: number;
  duration: number;
  effectGeneration: number;
  onComplete: () => void;
};

type KartState = {
  ids: string[];
  kartBounceToken: number;
  kartEffectGeneration: number;
  kartAddActive: number;
  flyBall: KartFlyBallFlight | null;
  add: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  pulseKartNav: () => void;
  bumpKartEffectGeneration: () => void;
  beginKartAdd: () => void;
  endKartAdd: () => void;
  startFlyBall: (flight: KartFlyBallFlight) => void;
  clearFlyBall: () => void;
};

export const useKartStore = create<KartState>()(
  persist(
    (set, get) => ({
      ids: [],
      kartBounceToken: 0,
      kartEffectGeneration: 0,
      kartAddActive: 0,
      flyBall: null,
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
      bumpKartEffectGeneration: () =>
        set((s) => ({ kartEffectGeneration: s.kartEffectGeneration + 1 })),
      beginKartAdd: () =>
        set((s) => ({ kartAddActive: s.kartAddActive + 1 })),
      endKartAdd: () =>
        set((s) => ({ kartAddActive: Math.max(0, s.kartAddActive - 1) })),
      startFlyBall: (flight) => set({ flyBall: flight }),
      clearFlyBall: () => set({ flyBall: null }),
    }),
    {
      name: "kidskatalog-kart",
      partialize: (state) => ({ ids: state.ids }),
    },
  ),
);
