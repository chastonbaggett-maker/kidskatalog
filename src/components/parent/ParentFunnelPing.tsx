"use client";

import { useEffect, useRef } from "react";
import { trackParentFunnel } from "@/lib/parent-funnel-client";
import type { ParentFunnelEvent } from "@/lib/parent-funnel";

/** One view ping per mount. Parent Mode only — never mount on kid surfaces. */
export function ParentFunnelPing({ event }: { event: ParentFunnelEvent }) {
  const sent = useRef(false);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    trackParentFunnel(event);
    // Intentionally once per mount (Strict Mode remounts still share this ref
    // on the client after hydration).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
