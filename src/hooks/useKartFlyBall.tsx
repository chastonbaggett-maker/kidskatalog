"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { getKartNavRect } from "@/lib/kart-nav-target";
import { useKartStore } from "@/lib/kart-store";

/** Screen-space gravity (px/s²) — tuned for a natural toss arc. */
const GRAVITY = 1050;
const POP_MS = 110;
/** Minimum height the ball rises above the button before falling. */
const APEX_LIFT_PX = 76;

type Flight = {
  fromX: number;
  fromY: number;
  vx: number;
  vy: number;
  toX: number;
  toY: number;
  duration: number;
};

function computeFlight(
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
): Flight | null {
  const vy0 = -Math.sqrt(2 * GRAVITY * APEX_LIFT_PX);
  const c = fromY - toY;
  const discriminant = vy0 * vy0 - 2 * GRAVITY * c;

  if (discriminant <= 0) return null;

  const duration = (-vy0 + Math.sqrt(discriminant)) / GRAVITY;
  const vx = (toX - fromX) / duration;

  return { fromX, fromY, vx, vy: vy0, toX, toY, duration };
}

export function useKartFlyBall() {
  const ballRef = useRef<HTMLSpanElement>(null);
  const rafRef = useRef(0);
  const [mounted, setMounted] = useState(false);
  const [flight, setFlight] = useState<Flight | null>(null);
  const pulseKartNav = useKartStore((s) => s.pulseKartNav);

  useEffect(() => setMounted(true), []);

  useEffect(
    () => () => {
      cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  const fire = useCallback((origin: DOMRect | null | undefined) => {
    const toRect = getKartNavRect();
    if (!origin || !toRect) return;

    const fromX = origin.left + origin.width / 2;
    const fromY = origin.top + 10;
    const toX = toRect.left + toRect.width / 2;
    const toY = toRect.top + toRect.height * 0.36;

    const path = computeFlight(fromX, fromY, toX, toY);
    if (path) setFlight(path);
  }, []);

  useLayoutEffect(() => {
    if (!flight) return;

    let cancelled = false;

    const run = () => {
      const el = ballRef.current;
      if (!el) {
        if (!cancelled) rafRef.current = requestAnimationFrame(run);
        return;
      }

      const { fromX, fromY, vx, vy, toX, toY, duration } = flight;
      el.style.left = `${fromX}px`;
      el.style.top = `${fromY}px`;
      el.style.transform = "translate(-50%, -50%) scale(0.65)";
      el.style.opacity = "1";

      const start = performance.now();
      const durationMs = duration * 1000;

      const tick = (now: number) => {
        if (cancelled) return;

        const elapsedMs = now - start;
        const elapsed = elapsedMs / 1000;

        if (elapsedMs >= durationMs) {
          el.style.left = `${toX}px`;
          el.style.top = `${toY}px`;
          el.style.transform = "translate(-50%, -50%) scale(0.7)";
          el.style.opacity = "0";
          pulseKartNav();
          window.setTimeout(() => setFlight(null), 70);
          return;
        }

        const x = fromX + vx * elapsed;
        const y = fromY + vy * elapsed + 0.5 * GRAVITY * elapsed * elapsed;
        const vyNow = vy + GRAVITY * elapsed;
        const tilt = Math.max(-62, Math.min(62, (vyNow / 380) * 32));

        const popT = Math.min(elapsedMs / POP_MS, 1);
        const popBoost = popT < 1 ? Math.sin(popT * Math.PI) * 0.14 : 0;
        const fallT = elapsedMs / durationMs;
        const scale = 0.82 + popBoost - fallT * 0.14;

        el.style.left = `${x}px`;
        el.style.top = `${y}px`;
        el.style.transform = `translate(-50%, -50%) scale(${scale}) rotate(${tilt}deg)`;
        el.style.opacity =
          elapsedMs > durationMs - 50 ? `${(durationMs - elapsedMs) / 50}` : "1";

        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
    };

    run();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafRef.current);
    };
  }, [flight, pulseKartNav]);

  const portal =
    mounted && flight
      ? createPortal(
          <span ref={ballRef} className="kart-fly-ball" aria-hidden />,
          document.body,
        )
      : null;

  return { fire, portal, flying: flight !== null };
}
