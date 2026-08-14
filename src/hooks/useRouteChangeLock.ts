"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  beginRouteChange,
  extendRouteChange,
  isInternalNavHref,
  ROUTE_CHANGE_LOCK_MS,
} from "@/lib/route-change";

/** Hide toy photos during client navigations to prevent fullscreen decode flashes. */
export function useRouteChangeLock(lockMs = ROUTE_CHANGE_LOCK_MS) {
  const pathname = usePathname();
  const prevPath = useRef(pathname);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      if (isInternalNavHref(href)) beginRouteChange(lockMs);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [lockMs]);

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname;
      extendRouteChange(lockMs);
    }
  }, [pathname, lockMs]);
}
