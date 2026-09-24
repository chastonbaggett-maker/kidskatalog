"use client";

import { useEffect } from "react";
import {
  audienceToAccentAttr,
  useAccentStore,
} from "@/lib/accent-store";
import type { Audience } from "@/types/toy";

function applyAccent(audience: Audience) {
  document.documentElement.dataset.accent = audienceToAccentAttr(audience);
}

/** Keeps <html data-accent> in sync so header/nav tokens update site-wide. */
export function AccentSync() {
  const audience = useAccentStore((s) => s.audience);

  useEffect(() => {
    applyAccent(audience);
  }, [audience]);

  return null;
}
