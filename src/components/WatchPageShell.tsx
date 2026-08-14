"use client";

import type { ReactNode } from "react";
import {
  useCrazyModeStore,
  crazyModeRootClass,
} from "@/lib/crazy-mode-store";

/** Applies session crazy-mode shell classes around the Watch page. */
export function WatchPageShell({ children }: { children: ReactNode }) {
  const crazyMode = useCrazyModeStore((s) => s.crazyMode);
  return (
    <div
      className={`shelf-page star-field flex min-h-0 flex-1 flex-col overflow-hidden ${crazyModeRootClass(crazyMode)}`}
    >
      {children}
    </div>
  );
}
