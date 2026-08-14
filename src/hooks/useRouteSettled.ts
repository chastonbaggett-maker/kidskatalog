"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ROUTE_CHANGE_LOCK_MS } from "@/lib/route-change";

/** False briefly after pathname changes — defer heavy below-fold mounts during nav. */
export function useRouteSettled(lockMs = ROUTE_CHANGE_LOCK_MS) {
  const pathname = usePathname();
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    setSettled(false);
    const timer = window.setTimeout(() => setSettled(true), lockMs);
    return () => window.clearTimeout(timer);
  }, [pathname, lockMs]);

  return settled;
}
