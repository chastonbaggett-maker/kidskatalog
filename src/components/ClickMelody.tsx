"use client";

import { useEffect, useRef, useState } from "react";
import { ClickMelodyEngine } from "@/lib/click-melody-engine";
import { useClickMelodyStore } from "@/lib/click-melody-store";
import { getMusicTrack } from "@/lib/music-tracks";

function isMusicalTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  if (target.closest("[data-click-melody-toggle]")) return false;
  return Boolean(
    target.closest(
      'button, a, [role="button"], input[type="button"], input[type="submit"], summary, label',
    ),
  );
}

type FloatNote = {
  id: number;
  burstX: number;
  burstY: number;
  driftX: number;
  delay: number;
  spin: number;
  scale: number;
};

const MAX_FLOAT_NOTES = 7;
const FLOAT_LIFE_MS = 3400;

let noteId = 0;
const floatTimers = new Map<number, number>();

/**
 * Mini music player: mute/unmute + next track, with one-shot tap tones
 * over the selected bed song. Songs play once; the playlist loops.
 */
export function ClickMelody() {
  const enabled = useClickMelodyStore((s) => s.enabled);
  const trackId = useClickMelodyStore((s) => s.trackId);
  const setEnabled = useClickMelodyStore((s) => s.setEnabled);
  const nextTrack = useClickMelodyStore((s) => s.nextTrack);
  const engineRef = useRef<ClickMelodyEngine | null>(null);
  const [mounted, setMounted] = useState(false);
  const [floatNotes, setFloatNotes] = useState<FloatNote[]>([]);

  const track = getMusicTrack(trackId);

  const spawnFloat = () => {
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.1;
    const burstDist = 28 + Math.random() * 18;
    const next: FloatNote = {
      id: ++noteId,
      burstX: Math.cos(angle) * burstDist,
      burstY: Math.sin(angle) * burstDist,
      driftX: (Math.random() - 0.5) * 42,
      delay: Math.random() * 30,
      spin: (Math.random() > 0.5 ? 1 : -1) * (18 + Math.random() * 40),
      scale: 0.95 + Math.random() * 0.35,
    };

    setFloatNotes((prev) => {
      const merged = [...prev, next];
      const overflow = merged.length - MAX_FLOAT_NOTES;
      if (overflow <= 0) return merged;
      const killed = merged.slice(0, overflow);
      for (const old of killed) {
        const t = floatTimers.get(old.id);
        if (t != null) {
          window.clearTimeout(t);
          floatTimers.delete(old.id);
        }
      }
      return merged.slice(overflow);
    });

    const timer = window.setTimeout(() => {
      floatTimers.delete(next.id);
      setFloatNotes((prev) => prev.filter((n) => n.id !== next.id));
    }, FLOAT_LIFE_MS);
    floatTimers.set(next.id, timer);
  };

  useEffect(() => {
    setMounted(true);
    const engine = new ClickMelodyEngine();
    engineRef.current = engine;
    const state = useClickMelodyStore.getState();
    engine.setTrack(state.trackId);
    engine.setMuted(!state.enabled);
    engine.setOnNote(() => {
      spawnFloat();
    });
    engine.setOnTrackEnded(() => {
      // Advance playlist when a bed finishes; store subscription starts the next.
      useClickMelodyStore.getState().nextTrack();
    });

    const onUnlock = () => {
      if (!useClickMelodyStore.getState().enabled) return;
      engine.unlock();
    };

    const onClick = (event: MouseEvent) => {
      if (!useClickMelodyStore.getState().enabled) return;
      if (event.button !== 0) return;
      if (!isMusicalTarget(event.target)) return;
      engine.note();
    };

    const unsub = useClickMelodyStore.subscribe((state, prev) => {
      if (state.trackId !== prev.trackId) {
        engine.setTrack(state.trackId);
      }
      if (state.enabled === prev.enabled) return;
      engine.setMuted(!state.enabled);
      if (!state.enabled) {
        for (const t of floatTimers.values()) window.clearTimeout(t);
        floatTimers.clear();
        setFloatNotes([]);
      }
    });

    document.addEventListener("pointerdown", onUnlock, true);
    document.addEventListener("click", onClick, true);

    return () => {
      unsub();
      document.removeEventListener("pointerdown", onUnlock, true);
      document.removeEventListener("click", onClick, true);
      engine.setOnNote(null);
      engine.setOnTrackEnded(null);
      engine.dispose();
      engineRef.current = null;
      for (const t of floatTimers.values()) window.clearTimeout(t);
      floatTimers.clear();
    };
  }, []);

  const playing = mounted ? enabled : true;
  const muteLabel = playing ? "Mute music" : "Play music";
  const nextLabel = `Next song (now: ${track.title})`;

  return (
    <div
      className={`site-music-toggle-wrap${playing ? " is-singing" : " is-muted"}`}
      data-click-melody-toggle
    >
      <div className="site-music-toggle__floats" aria-hidden>
        {floatNotes.map((n) => (
          <span
            key={n.id}
            className="site-music-toggle__float is-live"
            style={{
              ["--burst-x" as string]: `${n.burstX}px`,
              ["--burst-y" as string]: `${n.burstY}px`,
              ["--drift-x" as string]: `${n.driftX}px`,
              ["--spin" as string]: `${n.spin}deg`,
              ["--scale" as string]: String(n.scale),
              animationDelay: `${n.delay}ms`,
            }}
          >
            <FloatNoteIcon />
          </span>
        ))}
      </div>

      <div className="site-music-player">
        <div className="site-music-player__controls">
          <button
            type="button"
            className="site-music-toggle"
            aria-label={muteLabel}
            aria-pressed={playing}
            title={muteLabel}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const engine = engineRef.current;
              const next = !useClickMelodyStore.getState().enabled;
              setEnabled(next);
              if (!engine) return;
              engine.setMuted(!next);
              if (!next) {
                for (const t of floatTimers.values()) window.clearTimeout(t);
                floatTimers.clear();
                setFloatNotes([]);
              } else {
                engine.unlock();
              }
            }}
          >
            <span className="site-music-toggle__icon" aria-hidden>
              <MusicIcon muted={!playing} />
            </span>
          </button>

          <button
            type="button"
            className="site-music-next"
            aria-label={nextLabel}
            title={nextLabel}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const engine = engineRef.current;
              nextTrack();
              if (!engine) return;
              engine.unlock();
              if (useClickMelodyStore.getState().enabled) {
                engine.setMuted(false);
              }
            }}
          >
            <span className="site-music-next__icon" aria-hidden>
              <NextIcon />
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function MusicIcon({ muted }: { muted: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M9 18V6.4l10-2.2V16"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={muted ? 0.45 : 1}
      />
      <circle cx="7" cy="18" r="2.4" fill="currentColor" opacity={muted ? 0.45 : 1} />
      <circle cx="17" cy="16" r="2.4" fill="currentColor" opacity={muted ? 0.45 : 1} />
      <path
        d="M4.5 5.5l15 14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        opacity={muted ? 1 : 0}
      />
    </svg>
  );
}

function NextIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M6.2 5.4a1 1 0 0 1 1.55-.83l8.2 5.6a1 1 0 0 1 0 1.66l-8.2 5.6A1 1 0 0 1 6 16.6V7.4a1 1 0 0 1 .2-.6Z" />
      <rect x="17.1" y="5.8" width="1.9" height="12.4" rx="0.95" />
    </svg>
  );
}

function FloatNoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M10 4.2v10.45a3.1 3.1 0 1 1-1.85-2.84V7.05l9-1.7v8.7a3.1 3.1 0 1 1-1.85-2.84V4.95L10 4.2Z" />
    </svg>
  );
}
