"use client";

import { useEffect, useRef } from "react";
import { pingMetrics } from "@/lib/metrics-client";

export function MetricsPing() {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    pingMetrics();
  }, []);

  return null;
}
