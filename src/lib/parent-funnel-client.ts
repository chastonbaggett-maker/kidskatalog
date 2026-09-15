import type { ParentFunnelEvent } from "@/lib/parent-funnel";

/** Fire-and-forget Parent Mode funnel ping. Never include Amazon tags or PII. */
export function trackParentFunnel(event: ParentFunnelEvent) {
  if (typeof window === "undefined") return;
  void fetch("/api/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(event),
    keepalive: true,
  }).catch(() => {});
}
