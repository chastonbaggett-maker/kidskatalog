"use client";

import { useEffect } from "react";
import {
  audienceToAccentAttr,
  useAccentStore,
} from "@/lib/accent-store";
import type { Audience } from "@/types/toy";

/** Transparent status bar / theme-color so top safe area shows content through. */
const TRANSPARENT_THEME = "transparent";

function applyAccent(audience: Audience) {
  const accent = audienceToAccentAttr(audience);
  document.documentElement.dataset.accent = accent;
  setThemeColor(TRANSPARENT_THEME);
}

function setThemeColor(color: string) {
  const metas = document.querySelectorAll('meta[name="theme-color"]');
  if (metas.length === 0) {
    const meta = document.createElement("meta");
    meta.setAttribute("name", "theme-color");
    meta.setAttribute("content", color);
    document.head.appendChild(meta);
    return;
  }
  metas.forEach((meta) => meta.setAttribute("content", color));
}

/** Keeps <html data-accent> + transparent PWA theme-color in sync site-wide. */
export function AccentSync() {
  const audience = useAccentStore((s) => s.audience);

  useEffect(() => {
    applyAccent(audience);
  }, [audience]);

  return null;
}
