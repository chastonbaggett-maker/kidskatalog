"use client";

import { useEffect, useState } from "react";

type PersistApi = {
  hasHydrated: () => boolean;
  onFinishHydration: (fn: () => void) => () => void;
};

/** True once a zustand persist store has read localStorage (avoids post-load mode flips). */
export function usePersistHydrated(persist?: PersistApi) {
  const [hydrated, setHydrated] = useState(() => {
    if (typeof window === "undefined" || !persist) return false;
    return persist.hasHydrated();
  });

  useEffect(() => {
    if (!persist) {
      setHydrated(true);
      return;
    }
    if (persist.hasHydrated()) {
      setHydrated(true);
      return;
    }
    return persist.onFinishHydration(() => setHydrated(true));
  }, [persist]);

  return hydrated;
}

export function getStorePersist(store: object): PersistApi | undefined {
  if ("persist" in store && store.persist) {
    return store.persist as PersistApi;
  }
  return undefined;
}
