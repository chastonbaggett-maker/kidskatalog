"use client";

import { useEffect, useRef, useState } from "react";
import { useConfettiBurst, GOLD_CONFETTI } from "@/hooks/useConfettiBurst";
import { unlockSharedAudio } from "@/lib/shared-audio";

const FADE_IN_MS = 700;
const DESKTOP_AUTO_TAP_MS = 780;
const TOUCH_FALLBACK_MS = 2600;
const OUT_AFTER_TAP_MS = 420;
const DONE_AFTER_TAP_MS = 1300;

type SplashPhase = "in" | "armed" | "tap" | "out" | "done";

function needsGestureForAudio() {
  if (typeof window === "undefined") return false;
  if (window.matchMedia("(pointer: coarse)").matches) return true;
  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
    return true;
  }
  return false;
}

/**
 * Cold-open splash: fade in the K, mimic a tap (confetti + burst SFX), then fade out.
 * On touch/iOS the tap waits for a real gesture so Web Audio can unlock.
 */
export function AppSplash() {
  const logoRef = useRef<HTMLSpanElement>(null);
  const [phase, setPhase] = useState<SplashPhase>("in");
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const { fire: fireConfetti, portal: confettiPortal } = useConfettiBurst({
    portalRoot,
  });
  const firedRef = useRef(false);
  const gestureRef = useRef(false);

  useEffect(() => {
    setPortalRoot(document.body);
    gestureRef.current = needsGestureForAudio();
  }, []);

  const runTap = (fromGesture: boolean) => {
    if (firedRef.current) return;
    firedRef.current = true;

    // Must unlock + play inside the gesture turn on iOS — not in a later effect.
    if (fromGesture) unlockSharedAudio();

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
    window.setTimeout(() => setPhase("out"), OUT_AFTER_TAP_MS);
    window.setTimeout(() => setPhase("done"), DONE_AFTER_TAP_MS);
  };

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase("done");
      return;
    }

    const armTimer = window.setTimeout(() => setPhase("armed"), FADE_IN_MS);
    return () => window.clearTimeout(armTimer);
  }, []);

  useEffect(() => {
    if (phase !== "armed" || firedRef.current) return;

    const delay = gestureRef.current
      ? TOUCH_FALLBACK_MS - FADE_IN_MS
      : DESKTOP_AUTO_TAP_MS - FADE_IN_MS;

    const timer = window.setTimeout(
      () => runTap(false),
      Math.max(60, delay),
    );
    return () => window.clearTimeout(timer);
    // runTap is stable enough via refs; intentionally omit to avoid re-arms.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const onSplashPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase === "out" || phase === "done" || firedRef.current) return;
    // Only primary press; keep the call stack in the user gesture.
    if (e.button !== 0) return;
    runTap(true);
  };

  if (phase === "done") return confettiPortal;

  return (
    <>
      <div
        className={`app-splash app-splash--${phase}`}
        role="presentation"
        aria-hidden
        onPointerDown={onSplashPointerDown}
      >
        <span ref={logoRef} className="app-splash__logo" />
      </div>
      {confettiPortal}
    </>
  );
}
