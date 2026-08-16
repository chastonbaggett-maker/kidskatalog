"use client";

import { useEffect, useRef, useState } from "react";
import { useConfettiBurst, GOLD_CONFETTI } from "@/hooks/useConfettiBurst";
import { unlockSharedAudio } from "@/lib/shared-audio";

/** Pause here — stars have landed on the K (Untitled2). */
const STARS_LAND_S = 2.4;
/** Auto-continue if the ready pose isn't tapped. */
const AUTO_TAP_MS = 3000;
/** Hold full-screen white before the fade so the handoff reads clean. */
const HOLD_WHITE_MS = 160;
/** Keep in sync with `--splash-fade-ms` / `.app-splash--out` CSS. */
const FADE_MS = 720;
const DONE_AFTER_WHITE_MS = HOLD_WHITE_MS + FADE_MS;

const SPLASH_INTRO_SRC = "/splash-intro.mp4?v=4";

type SplashPhase =
  | "in"
  | "playing"
  | "ready"
  | "finishing"
  | "white"
  | "out"
  | "done";

function setSplashState(state: "active" | "exiting" | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (state) root.dataset.splash = state;
  else delete root.dataset.splash;
}

/**
 * Cold-open splash: play logo intro until stars land, wait for tap
 * (or auto-tap), finish through white, then fade into the page.
 */
export function AppSplash() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<SplashPhase>("in");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const { fire: fireConfetti, portal: confettiPortal } = useConfettiBurst({
    portalRoot,
  });
  const pausedForTapRef = useRef(false);
  const finishingRef = useRef(false);
  const exitedRef = useRef(false);
  const autoTapTimerRef = useRef<number | null>(null);
  const outTimersRef = useRef<number[]>([]);

  useEffect(() => {
    setPortalRoot(document.body);
    setSplashState("active");
  }, []);

  const clearAutoTap = () => {
    if (autoTapTimerRef.current != null) {
      window.clearTimeout(autoTapTimerRef.current);
      autoTapTimerRef.current = null;
    }
  };

  const finishSplash = () => {
    setSplashState(null);
    setPhase("done");
  };

  const beginWhiteExit = () => {
    if (exitedRef.current) return;
    exitedRef.current = true;
    clearAutoTap();

    const video = videoRef.current;
    if (video) {
      try {
        video.pause();
      } catch {
        /* ignore */
      }
    }

    const rect = markRef.current?.getBoundingClientRect();
    const origin = rect
      ? {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        }
      : {
          x: window.innerWidth / 2,
          y: window.innerHeight * 0.42,
        };

    unlockSharedAudio();
    fireConfetti(origin, GOLD_CONFETTI);

    setSplashState("exiting");
    setPhase("white");

    outTimersRef.current.push(
      window.setTimeout(() => {
        setPhase("out");
      }, HOLD_WHITE_MS),
      window.setTimeout(() => {
        finishSplash();
      }, DONE_AFTER_WHITE_MS),
    );
  };

  const resumeFinish = () => {
    if (finishingRef.current || exitedRef.current) return;
    finishingRef.current = true;
    clearAutoTap();
    setPhase("finishing");

    const video = videoRef.current;
    if (!video) {
      beginWhiteExit();
      return;
    }

    void video.play().catch(() => {
      beginWhiteExit();
    });
  };

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      finishSplash();
      return;
    }

    unlockSharedAudio();
    setPhase("playing");

    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.playsInline = true;
      void video.play().catch(() => {
        /* Autoplay may be blocked; still show first frame. */
      });
    }

    const onTimeUpdate = () => {
      if (!video || pausedForTapRef.current || finishingRef.current) return;
      if (video.currentTime < STARS_LAND_S) return;

      pausedForTapRef.current = true;
      try {
        video.pause();
        video.currentTime = STARS_LAND_S;
      } catch {
        /* ignore seek errors */
      }
      setPhase("ready");
      autoTapTimerRef.current = window.setTimeout(() => {
        resumeFinish();
      }, AUTO_TAP_MS);
    };

    const onEnded = () => {
      if (!finishingRef.current) {
        // Safety: if we somehow reach the end before pausing, still exit.
        beginWhiteExit();
        return;
      }
      beginWhiteExit();
    };

    video?.addEventListener("timeupdate", onTimeUpdate);
    video?.addEventListener("ended", onEnded);

    return () => {
      video?.removeEventListener("timeupdate", onTimeUpdate);
      video?.removeEventListener("ended", onEnded);
      clearAutoTap();
      for (const t of outTimersRef.current) window.clearTimeout(t);
      outTimersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSplashPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    if (phase !== "ready" || finishingRef.current || exitedRef.current) return;
    resumeFinish();
  };

  if (phase === "done") return confettiPortal;

  return (
    <>
      <div
        className={`app-splash app-splash--${phase}`}
        role="button"
        tabIndex={0}
        aria-label={
          phase === "ready" ? "Tap to continue" : "KidsKatalog intro"
        }
        onPointerDown={onSplashPointerDown}
        onKeyDown={(e) => {
          if (phase !== "ready") return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            resumeFinish();
          }
        }}
      >
        <video
          ref={videoRef}
          className="app-splash__video"
          src={SPLASH_INTRO_SRC}
          muted
          playsInline
          preload="auto"
          aria-hidden
        />
        <span ref={markRef} className="app-splash__mark" aria-hidden />
      </div>
      {confettiPortal}
    </>
  );
}
