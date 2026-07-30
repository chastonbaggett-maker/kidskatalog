"use client";

import { useEffect } from "react";
import { audienceToAccentAttr, useAccentStore } from "@/lib/accent-store";

/** Keeps <html data-accent> in sync so CSS accent tokens update site-wide. */
export function AccentSync() {
  const audience = useAccentStore((s) => s.audience);

  useEffect(() => {
    document.documentElement.dataset.accent = audienceToAccentAttr(audience);
  }, [audience]);

  useEffect(() => {
    // Re-apply after persist hydration (may lag first paint)
    const unsub = useAccentStore.persist.onFinishHydration((state) => {
      document.documentElement.dataset.accent = audienceToAccentAttr(
        state.audience,
      );
    });
    if (useAccentStore.persist.hasHydrated()) {
      document.documentElement.dataset.accent = audienceToAccentAttr(
        useAccentStore.getState().audience,
      );
    }
    return unsub;
  }, []);

  return null;
}
