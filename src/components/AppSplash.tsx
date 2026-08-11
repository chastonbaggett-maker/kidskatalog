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
 * Cold-open splash: fade in the K, pulse ring until tap (or auto after 5s),
 * then confetti + burst SFX and fade out. Logo stays viewport-centered.
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

  const runTap = () => {
    if (firedRef.current) return;
    firedRef.current = true;

    // Measure center before phase change so confetti originates on the mark.
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

    // Unlock + play in the same turn when this came from a real press.
    unlockSharedAudio();
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
    const autoTimer = window.setTimeout(() => runTap(), FADE_IN_MS + AUTO_TAP_MS);

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
        <div className="app-splash__logo-wrap">
          <span className="app-splash__pulse-ring" aria-hidden />
          <span ref={logoRef} className="app-splash__logo" />
        </div>
      </div>
      {confettiPortal}
    </>
  );
}
