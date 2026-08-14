"use client";

import { useEffect, useState } from "react";

/** Tracks html.route-changing — set before React on internal link clicks. */
export function useRouteChanging() {
  const [changing, setChanging] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const sync = () => setChanging(root.classList.contains("route-changing"));
    sync();
    const obs = new MutationObserver(sync);
    obs.observe(root, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);

  return changing;
}
