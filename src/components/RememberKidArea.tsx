"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { rememberKidArea } from "@/lib/last-kid-area";

/** Keeps the last kid browse path so Kart's back button can return there. */
export function RememberKidArea() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const search = searchParams.toString();
    rememberKidArea(pathname, search ? `?${search}` : "");
  }, [pathname, searchParams]);

  return null;
}
