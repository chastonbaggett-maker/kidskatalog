"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  KART_EFFECT_ARM_MS,
  KART_EFFECT_QUIET_MS,
  KART_NAV_PULSE_MS,
} from "@/lib/kart-effect-guard";
import { syncKartBootDataset } from "@/lib/kart-boot";

export type KartFlyBallFlight = {
  fromX: number;
  fromY: number;
  vx: number;
  vy: number;
  toX: number;
  toY: number;
  duration: number;
  effectGeneration: number;
};

type KartState = {
  ids: string[];
  kartBounceToken: number;
  kartEffectGeneration: number;
  kartAddActive: number;
  kartQuietUntil: number;
  flyBall: KartFlyBallFlight | null;
  add: (id: string) => void;
  addWithNavPulse: (id: string) => void;
  remove: (id: string) => void;
  toggle: (id: string) => void;
  clear: () => void;
  has: (id: string) => boolean;
  pulseKartNav: () => void;
  bumpKartEffectGeneration: () => void;
  beginKartAdd: () => void;
  endKartAdd: () => void;
  cancelKartAddEffects: () => void;
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
      kartQuietUntil: 0,
      flyBall: null,
      add: (id) =>
        set((s) => {
          if (s.ids.includes(id)) return s;
          const ids = [...s.ids, id];
          syncKartBootDataset(ids);
          return { ids };
        }),
      addWithNavPulse: (id) =>
        set((s) => {
          const now = Date.now();
          const nextIds = s.ids.includes(id) ? s.ids : [...s.ids, id];
          syncKartBootDataset(nextIds);
          return {
            ids: nextIds,
            kartBounceToken: s.kartBounceToken + 1,
            kartQuietUntil: Math.max(
              s.kartQuietUntil,
              now + KART_NAV_PULSE_MS,
            ),
          };
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
      pulseKartNav: () =>
        set((s) => ({
          kartBounceToken: s.kartBounceToken + 1,
          kartQuietUntil: Math.max(
            s.kartQuietUntil,
            Date.now() + KART_NAV_PULSE_MS,
          ),
        })),
      bumpKartEffectGeneration: () =>
        set((s) => ({ kartEffectGeneration: s.kartEffectGeneration + 1 })),
      beginKartAdd: () =>
        set((s) => {
          const armedUntil = Date.now() + KART_EFFECT_ARM_MS;
          return {
            kartAddActive: s.kartAddActive + 1,
            kartQuietUntil: Math.max(s.kartQuietUntil, armedUntil),
          };
        }),
      endKartAdd: () =>
        set((s) => ({
          kartAddActive: Math.max(0, s.kartAddActive - 1),
          kartQuietUntil: Math.max(
            s.kartQuietUntil,
            Date.now() + KART_EFFECT_QUIET_MS,
          ),
        })),
      cancelKartAddEffects: () =>
        set({
          flyBall: null,
          kartAddActive: 0,
        }),
      startFlyBall: (flight) => set({ flyBall: flight }),
      clearFlyBall: () => set({ flyBall: null }),
    }),
    {
      name: "kidskatalog-kart",
      partialize: (state) => ({ ids: state.ids }),
    },
  ),
);
