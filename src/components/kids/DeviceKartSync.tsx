"use client";

import { useEffect } from "react";
import { useKartStore } from "@/lib/kart-store";

/** While a device is paired, Kart adds and removes update the grown-up's list. */
export function DeviceKartSync() {
  useEffect(() => {
    let last = useKartStore.getState().ids.join("\n");
    return useKartStore.subscribe((state) => {
      const key = state.ids.join("\n");
      if (key === last) return;
      last = key;
      void fetch("/api/kids/kart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toyIds: state.ids }),
      }).catch(() => undefined);
    });
  }, []);
  return null;
}
