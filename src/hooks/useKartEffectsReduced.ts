"use client";

import { useEffect, useState } from "react";

/** Touch / iOS / PWA — tone down heavy button chrome; fly-ball + confetti stay on. */
export function detectKartEffectsReduced() {
  if (typeof window === "undefined") return false;

  const html = document.documentElement;
  if (html.dataset.standalone === "true") return true;
  if (window.matchMedia("(pointer: coarse)").matches) return true;

  const ua = navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  if (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1) {
    return true;
  }

  return false;
}

function syncKartEffectsReducedDataset(reduced: boolean) {
  if (typeof document === "undefined") return;
  if (reduced) {
    document.documentElement.dataset.kartEffectsReduced = "true";
  } else {
    delete document.documentElement.dataset.kartEffectsReduced;
  }
}

export function useKartEffectsReduced() {
  const [reduced, setReduced] = useState(() => {
    const detected = detectKartEffectsReduced();
    syncKartEffectsReducedDataset(detected);
    return detected;
  });

  useEffect(() => {
    const detected = detectKartEffectsReduced();
    setReduced(detected);
    syncKartEffectsReducedDataset(detected);
  }, []);

  return reduced;
}
