"use client";

import { useEffect, useRef } from "react";
import {
  cancelKartFlyBall,
  registerKartFlyBallEl,
} from "@/lib/kart-fly-ball";

/** Always-mounted ball node — animation is imperative, never portals on click. */
export function KartFlyBallHost() {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    registerKartFlyBallEl(ref.current);
    return () => {
      cancelKartFlyBall();
      registerKartFlyBallEl(null);
    };
  }, []);

  return <span ref={ref} className="kart-fly-ball" aria-hidden />;
}
