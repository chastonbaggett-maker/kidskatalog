"use client";

import { useEffect, useState } from "react";

const SPLASH_MS = 2000;

/**
 * Cold-open splash: fade in the K mark, then fade out to the app (2s total).
 * Mounts once per full document load; client navigations do not re-trigger it.
 */
export function AppSplash() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduced ? 0 : SPLASH_MS;
    const timer = window.setTimeout(() => setVisible(false), ms);
    return () => window.clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div className="app-splash" role="presentation" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element -- splash must paint without Next image runtime */}
      <img
        className="app-splash__logo"
        src="/logo-icon.png"
        alt=""
        width={120}
        height={176}
        decoding="async"
        draggable={false}
      />
    </div>
  );
}
