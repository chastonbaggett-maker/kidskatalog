"use client";

import { useEffect, useState } from "react";

/** True after two animation frames — skips mount/route transition CSS flashes. */
export function useVisualSettled(deps?: unknown) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(false);
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setReady(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  }, [deps]);

  return ready;
}
