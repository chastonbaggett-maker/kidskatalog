"use client";

import { useEffect, useRef, useState } from "react";
import { useConfettiBurst, GOLD_CONFETTI } from "@/hooks/useConfettiBurst";
import { unlockSharedAudio } from "@/lib/shared-audio";

const TAP_AT_MS = 750;
const FADE_OUT_AT_MS = 1150;
const DONE_MS = 2000;

type SplashPhase = "in" | "tap" | "out" | "done";

/**
 * Cold-open splash: fade in the K, mimic a tap (confetti + burst SFX), then fade out.
 * Mounts once per full document load; client navigations do not re-trigger it.
 */
export function AppSplash() {
  const logoRef = useRef<HTMLImageElement>(null);
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

    // Warm the shared audio graph early so the auto-tap SFX can play when possible.
    unlockSharedAudio();

    const timers = [
      window.setTimeout(() => setPhase("tap"), TAP_AT_MS),
      window.setTimeout(() => setPhase("out"), FADE_OUT_AT_MS),
      window.setTimeout(() => setPhase("done"), DONE_MS),
    ];
    return () => {
      for (const t of timers) window.clearTimeout(t);
    };
  }, []);

  useEffect(() => {
    if (phase !== "tap" || firedRef.current) return;
    firedRef.current = true;
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
  }, [phase, fireConfetti]);

  if (phase === "done") return confettiPortal;

  return (
    <>
      <div
        className={`app-splash app-splash--${phase}`}
        role="presentation"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- splash must paint without Next image runtime */}
        <img
          ref={logoRef}
          className={`app-splash__logo${
            phase === "tap" || phase === "out" ? " app-splash__logo--tap" : ""
          }`}
          src="/logo-icon.png"
          alt=""
          width={64}
          height={94}
          decoding="async"
          draggable={false}
        />
      </div>
      {confettiPortal}
    </>
  );
}
