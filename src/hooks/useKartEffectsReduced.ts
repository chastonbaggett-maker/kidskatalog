"use client";

import { useEffect, useState } from "react";

/** Touch / iOS / PWA — skip fullscreen fixed-effect layers that flash on compositor repaint. */
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

export function useKartEffectsReduced() {
  const [reduced, setReduced] = useState(() => detectKartEffectsReduced());

  useEffect(() => {
    setReduced(detectKartEffectsReduced());
  }, []);

  return reduced;
}
