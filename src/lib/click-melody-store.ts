"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_MUSIC_TRACK_ID,
  MUSIC_TRACKS,
  nextMusicTrackId,
} from "@/lib/music-tracks";

type ClickMelodyState = {
  enabled: boolean;
  trackId: string;
  setEnabled: (value: boolean) => void;
  toggle: () => void;
  setTrackId: (trackId: string) => void;
  nextTrack: () => void;
};

function normalizeTrackId(id: unknown): string {
  if (typeof id === "string" && MUSIC_TRACKS.some((t) => t.id === id)) {
    return id;
  }
  return DEFAULT_MUSIC_TRACK_ID;
}

export const useClickMelodyStore = create<ClickMelodyState>()(
  persist(
    (set, get) => ({
      enabled: true,
      trackId: DEFAULT_MUSIC_TRACK_ID,
      setEnabled: (enabled) => set({ enabled }),
      toggle: () => set((s) => ({ enabled: !s.enabled })),
      setTrackId: (trackId) => set({ trackId: normalizeTrackId(trackId) }),
      nextTrack: () => set({ trackId: nextMusicTrackId(get().trackId) }),
    }),
    {
      name: "kidskatalog-click-melody",
      partialize: (s) => ({ enabled: s.enabled, trackId: s.trackId }),
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ClickMelodyState>;
        return {
          ...current,
          ...p,
          trackId: normalizeTrackId(p.trackId ?? current.trackId),
          enabled: typeof p.enabled === "boolean" ? p.enabled : current.enabled,
        };
      },
    },
  ),
);
