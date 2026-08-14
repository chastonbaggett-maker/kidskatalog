"use client";

import { useState } from "react";
import { CrazyModeButton } from "@/components/CrazyModeButton";
import { useCrazyModeStore } from "@/lib/crazy-mode-store";

/** Header Crazy Mode control shown while crazy is active in the session. */
export function ShelfCrazyTrailing() {
  const crazyMode = useCrazyModeStore((s) => s.crazyMode);
  const setCrazyMode = useCrazyModeStore((s) => s.setCrazyMode);
  const [crazyFlash, setCrazyFlash] = useState(false);

  if (!crazyMode) return null;

  return (
    <CrazyModeButton
      className="shelf-crazy-btn"
      crazyMode
      crazyFlash={crazyFlash}
      onClick={() => {
        setCrazyFlash(false);
        setCrazyMode(false);
      }}
    />
  );
}
