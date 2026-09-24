"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  emptyInterest,
  interestScore,
  type ToyInterest,
} from "@/lib/toy-interest";

type ToyInterestState = {
  byId: Record<string, ToyInterest>;
  recordOpen: (id: string) => void;
  recordPhoto: (id: string, src: string) => void;
  recordSeconds: (id: string, seconds: number) => void;
};

const OPEN_DEDUPE_MS = 2000;
const PHOTO_DEDUPE_MS = 1500;

let lastOpen: { id: string; at: number } | null = null;
const lastPhotoAt = new Map<string, number>();

function bump(
  current: ToyInterest | undefined,
  patch: Partial<ToyInterest>,
): ToyInterest {
  const base = current ?? emptyInterest();
  return {
    opens: base.opens + (patch.opens ?? 0),
    photos: base.photos + (patch.photos ?? 0),
    seconds: base.seconds + (patch.seconds ?? 0),
  };
}

export const useToyInterestStore = create<ToyInterestState>()(
  persist(
    (set) => ({
      byId: {},
      recordOpen: (id) => {
        if (!id) return;
        const now = Date.now();
        if (lastOpen && lastOpen.id === id && now - lastOpen.at < OPEN_DEDUPE_MS) {
          return;
        }
        lastOpen = { id, at: now };
        set((state) => ({
          byId: { ...state.byId, [id]: bump(state.byId[id], { opens: 1 }) },
        }));
      },
      recordPhoto: (id, src) => {
        if (!id || !src) return;
        const key = `${id}\n${src}`;
        const now = Date.now();
        const previous = lastPhotoAt.get(key) ?? 0;
        if (now - previous < PHOTO_DEDUPE_MS) return;
        lastPhotoAt.set(key, now);
        set((state) => ({
          byId: { ...state.byId, [id]: bump(state.byId[id], { photos: 1 }) },
        }));
      },
      recordSeconds: (id, seconds) => {
        const add = Math.floor(seconds);
        if (!id || add <= 0) return;
        set((state) => ({
          byId: {
            ...state.byId,
            [id]: bump(state.byId[id], { seconds: add }),
          },
        }));
      },
    }),
    {
      name: "kidskatalog-toy-interest",
      partialize: (state) => ({ byId: state.byId }),
    },
  ),
);

export function interestScoreFor(id: string): number {
  return interestScore(useToyInterestStore.getState().byId[id]);
}
