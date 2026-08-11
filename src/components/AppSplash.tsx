"use client";

import { useEffect, useRef, useState } from "react";
import { useConfettiBurst, GOLD_CONFETTI } from "@/hooks/useConfettiBurst";
import { unlockSharedAudio } from "@/lib/shared-audio";

const FADE_IN_MS = 700;
const AUTO_TAP_MS = 5000;
const OUT_AFTER_TAP_MS = 420;
const DONE_AFTER_TAP_MS = 1300;

type SplashPhase = "in" | "armed" | "tap" | "out" | "done";

/**
 * Cold-open splash: fade in the K, pulse with a kid tap hint until tap
 * (or auto-tap after 5s), then confetti + burst SFX and fade out.
 */
export function AppSplash() {
  const logoRef = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<SplashPhase>("in");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const { fire: fireConfetti, portal: confettiPortal } = useConfettiBurst({
    portalRoot,
  });
  const firedRef = useRef(false);
  const outTimersRef = useRef<number[]>([]);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  const runTap = (_fromGesture: boolean) => {
    if (firedRef.current) return;
    firedRef.current = true;

    // Unlock + play in the same turn when this came from a real press.
    unlockSharedAudio();

    const rect = logoRef.current?.getBoundingClientRect();
    const origin = rect
      ? {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
        }
      : {
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
        };

    fireConfetti(origin, GOLD_CONFETTI);
    setPhase("tap");

    outTimersRef.current.push(
      window.setTimeout(() => setPhase("out"), OUT_AFTER_TAP_MS),
      window.setTimeout(() => setPhase("done"), DONE_AFTER_TAP_MS),
    );
  };

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase("done");
      return;
    }

    unlockSharedAudio();

    const armTimer = window.setTimeout(() => setPhase("armed"), FADE_IN_MS);
    const autoTimer = window.setTimeout(
      () => runTap(false),
      FADE_IN_MS + AUTO_TAP_MS,
    );

    return () => {
      window.clearTimeout(armTimer);
      window.clearTimeout(autoTimer);
      for (const t of outTimersRef.current) window.clearTimeout(t);
      outTimersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSplashPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase === "out" || phase === "done" || firedRef.current) return;
    if (e.button !== 0) return;
    runTap(true);
  };

  if (phase === "done") return confettiPortal;

  const showHint = phase === "in" || phase === "armed";

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
            runTap(true);
          }
        }}
      >
        <div className="app-splash__stage">
          <div className="app-splash__logo-wrap">
            <span className="app-splash__pulse-ring" aria-hidden />
            <span ref={logoRef} className="app-splash__logo" />
          </div>
          {showHint ? (
            <div className="app-splash__hint" aria-hidden>
              <span className="app-splash__tap-finger">
                <svg viewBox="0 0 64 64" width="36" height="36" aria-hidden>
                  <path
                    fill="currentColor"
                    d="M30 6c-2.4 0-4.4 2-4.4 4.4v22.2l-6.2-4.1c-2.3-1.5-5.4-.7-6.7 1.7-1.2 2.2-.5 5 1.6 6.3l14.8 9.2c1.5.9 3.2 1.4 5 1.4h8.7c3.6 0 6.6-2.7 7-6.3l1.4-13.2c.3-2.8-1.8-5.3-4.6-5.3-1 0-2 .3-2.8.9V10.4C43.8 8 41.8 6 39.4 6c-1.5 0-2.8.7-3.6 1.8C34.9 6.7 33.5 6 32 6c-.7 0-1.4.1-2 .4V6z"
                  />
                  <circle
                    className="app-splash__tap-ripple"
                    cx="22"
                    cy="44"
                    r="7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  />
                </svg>
              </span>
              <span className="app-splash__hint-text">Tap!</span>
            </div>
          ) : null}
        </div>
      </div>
      {confettiPortal}
    </>
  );
}
