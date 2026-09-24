"use client";

import { useLayoutEffect, useState } from "react";
import {
  audienceToAccentAttr,
  useAccentStore,
} from "@/lib/accent-store";
import { useCrazyModeStore } from "@/lib/crazy-mode-store";
import { useToyPileModeStore } from "@/lib/toy-pile-store";
import {
  readSafariHeaderSolid,
  scheduleSafariChromeTintNudge,
} from "@/lib/safari-chrome-tint";
import type { Audience } from "@/types/toy";

function applyAccent(audience: Audience) {
  document.documentElement.dataset.accent = audienceToAccentAttr(audience);
}

/**
 * Keeps <html data-accent> in sync and forces Safari 26 to re-sample the
 * top safe-area tint whenever mode colors change (accent / crazy / pile).
 *
 * Remounts a fixed safe-area probe on each change so Safari sees a fresh
 * edge element + layout, matching header color timing. Hidden in PWA via CSS.
 */
export function AccentSync() {
  const audience = useAccentStore((s) => s.audience);
  const crazyMode = useCrazyModeStore((s) => s.crazyMode);
  const pileMode = useToyPileModeStore((s) => s.toyPileMode);
  const [probe, setProbe] = useState<{ key: number; color: string }>({
    key: 0,
    color: "#2bb8a8",
  });

  useLayoutEffect(() => {
    applyAccent(audience);
  }, [audience]);

  useLayoutEffect(() => {
    if (document.documentElement.dataset.standalone === "true") return;

    // App-shell / feed classes for crazy+pile land in this same commit.
    const color = readSafariHeaderSolid();
    setProbe((prev) => ({ key: prev.key + 1, color }));
    scheduleSafariChromeTintNudge();
  }, [audience, crazyMode, pileMode]);

  return (
    <div
      key={probe.key}
      className="safari-safe-area-tint"
      style={{ backgroundColor: probe.color }}
      aria-hidden
    />
  );
}
