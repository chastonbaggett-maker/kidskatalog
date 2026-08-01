"use client";

import { useEffect, useState } from "react";
import { PILE_CHROME_MS } from "@/lib/toy-pile-store";
import { prefersReducedMotion } from "@/lib/pile-transition-utils";

/** True once the pile bottom shelf enter animation has finished. */
export function usePileNavSettled(raised: boolean) {
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    if (!raised) {
      setSettled(false);
      return;
    }

    if (prefersReducedMotion()) {
      setSettled(true);
      return;
    }

    const id = window.setTimeout(() => setSettled(true), PILE_CHROME_MS);
    return () => window.clearTimeout(id);
  }, [raised]);

  return settled;
}
