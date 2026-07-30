"use client";

import { useEffect } from "react";

/**
 * Keeps --vvh / --vv-top in sync with the visual viewport so the app shell
 * and bottom nav can sit flush on the real screen (iOS Safari + PWA).
 */
export function ViewportLock() {
  useEffect(() => {
    const root = document.documentElement;

    const sync = () => {
      const vv = window.visualViewport;
      const height = Math.round(vv?.height ?? window.innerHeight);
      const top = Math.round(vv?.offsetTop ?? 0);
      root.style.setProperty("--vvh", `${height}px`);
      root.style.setProperty("--vv-top", `${top}px`);
    };

    sync();
    window.visualViewport?.addEventListener("resize", sync);
    window.visualViewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);

    return () => {
      window.visualViewport?.removeEventListener("resize", sync);
      window.visualViewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
    };
  }, []);

  return null;
}
