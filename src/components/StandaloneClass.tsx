"use client";

import { useEffect } from "react";

/**
 * Marks <html data-standalone> for installed iOS/Android PWAs.
 * CSS @media (display-mode: standalone) is unreliable on some iOS versions;
 * navigator.standalone is the legacy iOS signal.
 */
export function StandaloneClass() {
  useEffect(() => {
    const root = document.documentElement;

    const apply = () => {
      const media = window.matchMedia("(display-mode: standalone)").matches;
      const iosLegacy =
        "standalone" in navigator &&
        (navigator as Navigator & { standalone?: boolean }).standalone === true;
      if (media || iosLegacy) root.dataset.standalone = "true";
      else delete root.dataset.standalone;
    };

    apply();
    const mq = window.matchMedia("(display-mode: standalone)");
    mq.addEventListener?.("change", apply);
    return () => mq.removeEventListener?.("change", apply);
  }, []);

  return null;
}
