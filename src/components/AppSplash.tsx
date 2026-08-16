"use client";

import { useEffect, useRef, useState } from "react";
import { useConfettiBurst, GOLD_CONFETTI } from "@/hooks/useConfettiBurst";
import { unlockSharedAudio } from "@/lib/shared-audio";

const OUT_AFTER_TAP_MS = 420;
/** Must match `.app-splash--out` animation duration. */
const FADE_OUT_MS = 850;
const DONE_AFTER_TAP_MS = OUT_AFTER_TAP_MS + FADE_OUT_MS;
/** Fallback if the video never fires `ended`. */
const AUTO_TAP_FALLBACK_MS = 5000;

type SplashPhase = "in" | "armed" | "tap" | "out" | "done";

function setSplashState(state: "active" | "exiting" | null) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  if (state) root.dataset.splash = state;
  else delete root.dataset.splash;
}

/**
 * Cold-open splash: unisex mint field + muted logo intro video, tap or
 * video-end to dismiss, then confetti + burst SFX. Whole-screen fades out.
 * Mounts once per full document load; client navigations do not remount it.
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

  const runTap = () => {
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

    // Prefer the invisible center mark; fall back to viewport center.
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
    setPhase("tap");

    outTimersRef.current.push(
      window.setTimeout(() => {
        setSplashState("exiting");
        setPhase("out");
      }, OUT_AFTER_TAP_MS),
      window.setTimeout(() => {
        finishSplash();
      }, DONE_AFTER_TAP_MS),
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

    const onEnded = () => runTap();
    video?.addEventListener("ended", onEnded);
    const fallback = window.setTimeout(() => runTap(), AUTO_TAP_FALLBACK_MS);

    return () => {
      video?.removeEventListener("ended", onEnded);
      window.clearTimeout(fallback);
      for (const t of outTimersRef.current) window.clearTimeout(t);
      outTimersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSplashPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase === "out" || phase === "done" || firedRef.current) return;
    if (e.button !== 0) return;
    runTap();
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
            runTap();
          }
        }}
      >
        <video
          ref={videoRef}
          className="app-splash__video"
          src="/splash-intro.mp4?v=3"
          muted
          playsInline
          preload="auto"
          aria-hidden
        />
        {/* Confetti origin — roughly where the K sits in the intro frame. */}
        <span ref={markRef} className="app-splash__mark" aria-hidden />
      </div>
      {confettiPortal}
    </>
  );
}
