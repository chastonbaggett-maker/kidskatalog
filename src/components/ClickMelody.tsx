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
  dx: number;
  delay: number;
  spin: number;
  scale: number;
  live: boolean;
};

let noteId = 0;

/**
 * Every button/link tap plays a melody note and stamps it into a soft
 * decaying loop. Mute stops new notes and silences the loop.
 */
export function ClickMelody() {
  const enabled = useClickMelodyStore((s) => s.enabled);
  const setEnabled = useClickMelodyStore((s) => s.setEnabled);
  const engineRef = useRef<ClickMelodyEngine | null>(null);
  const [mounted, setMounted] = useState(false);
  const [floatNotes, setFloatNotes] = useState<FloatNote[]>([]);

  const spawnFloat = (live: boolean) => {
    const next: FloatNote = {
      id: ++noteId,
      dx: (Math.random() - 0.5) * (live ? 36 : 24),
      delay: Math.random() * 40,
      spin: (Math.random() > 0.5 ? 1 : -1) * (12 + Math.random() * 28),
      scale: live ? 0.9 + Math.random() * 0.35 : 0.55 + Math.random() * 0.25,
      live,
    };
    setFloatNotes((prev) => [...prev.slice(-14), next]);
    window.setTimeout(() => {
      setFloatNotes((prev) => prev.filter((n) => n.id !== next.id));
    }, live ? 1100 : 900);
  };

  useEffect(() => {
    setMounted(true);
    const engine = new ClickMelodyEngine();
    engineRef.current = engine;
    engine.setMuted(!useClickMelodyStore.getState().enabled);
    engine.setOnNote(({ live }) => {
      // Loop echoes are quieter visually so the halo doesn't flood.
      if (!live && Math.random() > 0.55) return;
      spawnFloat(live);
    });

    const onUnlock = () => {
      if (!useClickMelodyStore.getState().enabled) return;
      void engine.unlock();
    };

    const onClick = (event: MouseEvent) => {
      if (!useClickMelodyStore.getState().enabled) return;
      if (event.button !== 0) return;
      if (!isMusicalTarget(event.target)) return;
      void engine.note();
    };

    const unsub = useClickMelodyStore.subscribe((state, prev) => {
      if (state.enabled === prev.enabled) return;
      engine.setMuted(!state.enabled);
      if (!state.enabled) {
        engine.clearLoop();
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
            className={`site-music-toggle__float${n.live ? " is-live" : " is-loop"}`}
            style={{
              ["--dx" as string]: `${n.dx}px`,
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
            engine.clearLoop();
            setFloatNotes([]);
          } else void engine.unlock();
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
