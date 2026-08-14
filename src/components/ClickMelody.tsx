"use client";

import { useEffect, useRef, useState } from "react";
import { ClickMelodyEngine } from "@/lib/click-melody-engine";
import { useClickMelodyStore } from "@/lib/click-melody-store";

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
  /** Quick outward burst */
  burstX: number;
  burstY: number;
  /** Slow float drift after the burst */
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
 * Every button/link tap plays a one-shot melody note over looping bed music
 * ("Marble Balloon Hop"). Mute stops new notes and fades the bed.
 */
export function ClickMelody() {
  const enabled = useClickMelodyStore((s) => s.enabled);
  const setEnabled = useClickMelodyStore((s) => s.setEnabled);
  const engineRef = useRef<ClickMelodyEngine | null>(null);
  const [mounted, setMounted] = useState(false);
  const [floatNotes, setFloatNotes] = useState<FloatNote[]>([]);

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
    engine.setMuted(!useClickMelodyStore.getState().enabled);
    engine.setOnNote(() => {
      spawnFloat();
    });

    const onUnlock = () => {
      if (!useClickMelodyStore.getState().enabled) return;
      engine.unlock();
    };

    const onClick = (event: MouseEvent) => {
      if (!useClickMelodyStore.getState().enabled) return;
      if (event.button !== 0) return;
      if (!isMusicalTarget(event.target)) return;
      // Sync note() — never await across the iOS gesture boundary.
      engine.note();
    };

    const unsub = useClickMelodyStore.subscribe((state, prev) => {
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
      engine.dispose();
      engineRef.current = null;
      for (const t of floatTimers.values()) window.clearTimeout(t);
      floatTimers.clear();
    };
  }, []);

  const playing = mounted ? enabled : true;
  const label = playing ? "Mute tap music" : "Play tap music";

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
      <button
        type="button"
        className="site-music-toggle"
        aria-label={label}
        aria-pressed={playing}
        title={label}
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

function FloatNoteIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
      <path d="M10 4.2v10.45a3.1 3.1 0 1 1-1.85-2.84V7.05l9-1.7v8.7a3.1 3.1 0 1 1-1.85-2.84V4.95L10 4.2Z" />
    </svg>
  );
}
