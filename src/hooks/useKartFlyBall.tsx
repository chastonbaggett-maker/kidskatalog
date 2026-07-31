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

const FLY_MS = 640;

type Flight = {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  ctrlX: number;
  ctrlY: number;
};

function quadBezier(t: number, p0: number, p1: number, p2: number) {
  const u = 1 - t;
  return u * u * p0 + 2 * u * t * p1 + t * t * p2;
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
    const fromY = origin.top + origin.height / 2;
    const toX = toRect.left + toRect.width / 2;
    const toY = toRect.top + toRect.height / 2;
    const ctrlX = (fromX + toX) / 2 + (Math.random() - 0.5) * 48;
    const ctrlY = Math.min(fromY, toY) - 80 - Math.random() * 40;

    setFlight({ fromX, fromY, toX, toY, ctrlX, ctrlY });
  }, []);

  useLayoutEffect(() => {
    if (!flight) return;
    const el = ballRef.current;
    if (!el) return;

    const { fromX, fromY, toX, toY, ctrlX, ctrlY } = flight;
    el.style.left = `${fromX}px`;
    el.style.top = `${fromY}px`;
    el.style.transform = "translate(-50%, -50%) scale(1)";
    el.style.opacity = "1";

    const start = performance.now();

    const tick = (now: number) => {
      const raw = Math.min((now - start) / FLY_MS, 1);
      const t = 1 - Math.pow(1 - raw, 2.15);
      const x = quadBezier(t, fromX, ctrlX, toX);
      const y = quadBezier(t, fromY, ctrlY, toY);
      const wobble = Math.sin(raw * Math.PI * 3.5) * (1 - raw) * 3;
      const scale = 1 - raw * 0.58;

      el.style.left = `${x + wobble}px`;
      el.style.top = `${y}px`;
      el.style.transform = `translate(-50%, -50%) scale(${scale})`;
      el.style.opacity = raw > 0.9 ? `${1 - (raw - 0.9) / 0.1}` : "1";

      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        pulseKartNav();
        window.setTimeout(() => setFlight(null), 60);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
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
