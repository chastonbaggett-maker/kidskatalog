"use client";

import { useEffect } from "react";
import {
  audienceToAccentAttr,
  useAccentStore,
  type AccentAttr,
} from "@/lib/accent-store";
import type { Audience } from "@/types/toy";

/** Solid status-bar / theme-color matching the left edge of --header-grad */
const STATUS_BAR_COLOR: Record<AccentAttr, string> = {
  both: "#4e89ff",
  boys: "#2f6ae8",
  girls: "#ef8fb3",
};

function applyAccent(audience: Audience) {
  const accent = audienceToAccentAttr(audience);
  document.documentElement.dataset.accent = accent;
  setThemeColor(STATUS_BAR_COLOR[accent]);
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

/** Keeps <html data-accent> + PWA theme-color in sync site-wide. */
export function AccentSync() {
  const audience = useAccentStore((s) => s.audience);

  useEffect(() => {
    applyAccent(audience);
  }, [audience]);

  useEffect(() => {
    const unsub = useAccentStore.persist.onFinishHydration((state) => {
      applyAccent(state.audience);
    });
    if (useAccentStore.persist.hasHydrated()) {
      applyAccent(useAccentStore.getState().audience);
    }
    return unsub;
  }, []);

  return null;
}
