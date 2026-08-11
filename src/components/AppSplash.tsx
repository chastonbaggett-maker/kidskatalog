"use client";

import { useEffect, useRef, useState } from "react";
import { useConfettiBurst, GOLD_CONFETTI } from "@/hooks/useConfettiBurst";
import { unlockSharedAudio } from "@/lib/shared-audio";

const TAP_AT_MS = 750;
const OUT_AFTER_TAP_MS = 420;
const DONE_MS = 2000;

type SplashPhase = "in" | "tap" | "out" | "done";

/**
 * Cold-open splash: fade in the K, auto-simulate a tap (confetti + burst SFX), fade out.
 * Sound plays when the browser allows autoplay (desktop usually; iOS often blocks until a real tap).
 */
export function AppSplash() {
  const logoRef = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<SplashPhase>("in");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const { fire: fireConfetti, portal: confettiPortal } = useConfettiBurst({
    portalRoot,
  });
  const firedRef = useRef(false);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase("done");
      return;
    }

    // Prime Web Audio as early as the browser allows.
    unlockSharedAudio();

    const timers = [
      window.setTimeout(() => {
        if (firedRef.current) return;
        firedRef.current = true;

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
      }, TAP_AT_MS),
      window.setTimeout(() => setPhase("out"), TAP_AT_MS + OUT_AFTER_TAP_MS),
      window.setTimeout(() => setPhase("done"), DONE_MS),
    ];

    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, [fireConfetti]);

  if (phase === "done") return confettiPortal;

  return (
    <>
      <div
        className={`app-splash app-splash--${phase}`}
        role="presentation"
        aria-hidden
      >
        <span ref={logoRef} className="app-splash__logo" />
      </div>
      {confettiPortal}
    </>
  );
}
