"use client";

import { useEffect, useState } from "react";
import {
  getPileNavModeRow,
  subscribePileNavModeRow,
} from "@/lib/pile-nav-mode-target";

export function usePileNavModeRowTarget() {
  const [target, setTarget] = useState<HTMLElement | null>(() => getPileNavModeRow());

  useEffect(() => subscribePileNavModeRow(() => setTarget(getPileNavModeRow())), []);

  return target;
}
