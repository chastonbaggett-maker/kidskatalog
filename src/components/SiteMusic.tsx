"use client";

import { useEffect, useRef, useState } from "react";
import { SiteMusicEngine } from "@/lib/site-music-engine";
import { registerSiteMusicEngine } from "@/lib/site-music-bridge";
import { useSiteMusicStore } from "@/lib/site-music-store";
import { cancelToySpeech } from "@/lib/toy-speech";

/**
 * Soft playful site music + mute/unmute control.
 * Mute always toggles; browsers still need one tap before sound can start.
 */
export function SiteMusic() {
  const enabled = useSiteMusicStore((s) => s.enabled);
  const setEnabled = useSiteMusicStore((s) => s.setEnabled);
  const engineRef = useRef<SiteMusicEngine | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const engine = new SiteMusicEngine();
    engineRef.current = engine;
    registerSiteMusicEngine(engine);

    const syncFromStore = () => {
      const on = useSiteMusicStore.getState().enabled;
      engine.setMuted(!on);
      if (on && document.visibilityState !== "hidden") {
        void engine.start();
      } else {
        engine.stop();
      }
    };

    const onGesture = () => {
      if (!useSiteMusicStore.getState().enabled) return;
      void engine.unlock().then((ok) => {
        if (ok) void engine.start();
      });
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        cancelToySpeech();
        engine.stop();
      } else {
        syncFromStore();
      }
    };

    const unsub = useSiteMusicStore.subscribe((state, prev) => {
      if (state.enabled === prev.enabled) return;
      if (!state.enabled) {
        cancelToySpeech();
        engine.setMuted(true);
        engine.stop();
      } else if (document.visibilityState !== "hidden") {
        engine.setMuted(false);
        void engine.start();
      }
    });

    syncFromStore();

    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      unsub();
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      document.removeEventListener("visibilitychange", onVisibility);
      cancelToySpeech();
      registerSiteMusicEngine(null);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  const playing = mounted ? enabled : true;
  const label = playing ? "Mute music" : "Play music";

  function toggleAudio() {
    const engine = engineRef.current;
    const next = !useSiteMusicStore.getState().enabled;
    setEnabled(next);
    if (!engine) return;
    void (async () => {
      if (next) {
        await engine.unlock();
        engine.setMuted(false);
        await engine.start();
      } else {
        cancelToySpeech();
        engine.setMuted(true);
        engine.stop();
      }
    })();
  }

  return (
    <button
      type="button"
      className="site-music-toggle"
      aria-label={label}
      aria-pressed={playing}
      title={label}
      onPointerDown={(e) => {
        // Keep the window gesture listener from also handling this control tap.
        e.stopPropagation();
      }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleAudio();
      }}
    >
      <span className="site-music-toggle__icon" aria-hidden>
        <MusicIcon muted={!playing} />
      </span>
    </button>
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
