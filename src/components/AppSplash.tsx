"use client";

import { useEffect, useRef, useState } from "react";
import { useConfettiBurst, GOLD_CONFETTI } from "@/hooks/useConfettiBurst";
import { unlockSharedAudio } from "@/lib/shared-audio";

/** Hold full-screen white before the fade so the handoff reads clean. */
const HOLD_WHITE_MS = 160;
/** Keep in sync with `--splash-fade-ms` / `.app-splash--out` CSS. */
const FADE_MS = 720;
const DONE_AFTER_WHITE_MS = HOLD_WHITE_MS + FADE_MS;
/** Fallback if the video never fires `ended`. */
const AUTO_END_FALLBACK_MS = 5000;

const SPLASH_INTRO_SRC = "/splash-intro.mp4?v=4";

type SplashPhase = "in" | "armed" | "white" | "out" | "done";

function setSplashState(state: "active" | "exiting" | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (state) root.dataset.splash = state;
  else delete root.dataset.splash;
}

/**
 * Cold-open splash: full-screen logo intro on mint, then solid white,
 * then a fade into the already-loaded page.
 */
export function AppSplash() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const markRef = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<SplashPhase>("in");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const { fire: fireConfetti, portal: confettiPortal } = useConfettiBurst({
    portalRoot,
  });
  const firedRef = useRef(false);
  const outTimersRef = useRef<number[]>([]);

  useEffect(() => {
    setPortalRoot(document.body);
    setSplashState("active");
  }, []);

  const finishSplash = () => {
    setSplashState(null);
    setPhase("done");
  };

  const beginExit = () => {
    if (firedRef.current || phase === "done") return;
    firedRef.current = true;

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

    // Full-screen white, then fade into the page.
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

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      finishSplash();
      return;
    }

    unlockSharedAudio();
    setPhase("armed");

    const video = videoRef.current;
    if (video) {
      video.muted = true;
      video.playsInline = true;
      void video.play().catch(() => {
        /* Autoplay may be blocked; still show first frame + allow tap. */
      });
    }

    const onEnded = () => beginExit();
    video?.addEventListener("ended", onEnded);
    const fallback = window.setTimeout(() => beginExit(), AUTO_END_FALLBACK_MS);

    return () => {
      video?.removeEventListener("ended", onEnded);
      window.clearTimeout(fallback);
      for (const t of outTimersRef.current) window.clearTimeout(t);
      outTimersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSplashPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase === "white" || phase === "out" || phase === "done" || firedRef.current)
      return;
    if (e.button !== 0) return;
    beginExit();
  };

  if (phase === "done") return confettiPortal;

  return (
    <>
      <div
        className={`app-splash app-splash--${phase}`}
        role="button"
        tabIndex={0}
        aria-label="Tap to start KidsKatalog"
        onPointerDown={onSplashPointerDown}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            beginExit();
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
