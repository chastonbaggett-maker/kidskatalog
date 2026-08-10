"use client";

import { useEffect, useRef, useState } from "react";
import { SiteMusicEngine } from "@/lib/site-music-engine";
import { useSiteMusicStore } from "@/lib/site-music-store";
import { getStorePersist, usePersistHydrated } from "@/hooks/usePersistHydrated";

/**
 * Soft playful site music + mute/unmute control.
 * Browsers block autoplay until a gesture — we unlock on first tap/key.
 */
export function SiteMusic() {
  const enabled = useSiteMusicStore((s) => s.enabled);
  const toggle = useSiteMusicStore((s) => s.toggle);
  const hydrated = usePersistHydrated(getStorePersist(useSiteMusicStore));
  const engineRef = useRef<SiteMusicEngine | null>(null);
  const [needsGesture, setNeedsGesture] = useState(true);

  useEffect(() => {
    const engine = new SiteMusicEngine();
    engineRef.current = engine;

    const tryStart = async () => {
      if (!useSiteMusicStore.getState().enabled) return;
      if (document.visibilityState === "hidden") return;
      await engine.start();
      setNeedsGesture(!engine.isUnlocked);
    };

    const onGesture = () => {
      void (async () => {
        const ok = await engine.unlock();
        if (ok) setNeedsGesture(false);
        if (useSiteMusicStore.getState().enabled) await engine.start();
      })();
    };

    const onVisibility = () => {
      if (document.visibilityState === "hidden") {
        engine.stop();
      } else if (useSiteMusicStore.getState().enabled) {
        void tryStart();
      }
    };

    void tryStart();

    window.addEventListener("pointerdown", onGesture, { passive: true });
    window.addEventListener("keydown", onGesture);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("pointerdown", onGesture);
      window.removeEventListener("keydown", onGesture);
      document.removeEventListener("visibilitychange", onVisibility);
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const engine = engineRef.current;
    if (!engine) return;

    engine.setMuted(!enabled);
    if (enabled && document.visibilityState !== "hidden") {
      void engine.start().then(() => {
        setNeedsGesture(!engine.isUnlocked);
      });
    } else {
      engine.stop();
    }
  }, [enabled, hydrated]);

  const playing = hydrated && enabled;
  const label = !hydrated
    ? "Music"
    : playing
      ? needsGesture
        ? "Tap to start music"
        : "Mute music"
      : "Play music";

  return (
    <button
      type="button"
      className="site-music-toggle"
      aria-label={label}
      aria-pressed={playing}
      title={label}
      onClick={(e) => {
        e.stopPropagation();
        const engine = engineRef.current;
        void (async () => {
          if (engine) {
            await engine.unlock();
            setNeedsGesture(!engine.isUnlocked);
          }
          // First unlock tap should start music, not mute it.
          if (enabled && needsGesture) {
            if (engine) await engine.start();
            return;
          }
          toggle();
        })();
      }}
    >
      <span className="site-music-toggle__icon" aria-hidden>
        {playing ? <MusicOnIcon /> : <MusicOffIcon />}
      </span>
    </button>
  );
}

function MusicOnIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M9 18V6.4l10-2.2V16"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="7" cy="18" r="2.4" fill="currentColor" />
      <circle cx="17" cy="16" r="2.4" fill="currentColor" />
    </svg>
  );
}

function MusicOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
      <path
        d="M9 18V6.4l10-2.2V16"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.45"
      />
      <circle cx="7" cy="18" r="2.4" fill="currentColor" opacity="0.45" />
      <circle cx="17" cy="16" r="2.4" fill="currentColor" opacity="0.45" />
      <path
        d="M4.5 5.5l15 14"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
