const SESSION_KEY = "kidskatalog-session-id";

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function pingMetrics(event?: "kart_add" | "kart_email" | "crazy_mode") {
  if (typeof window === "undefined") return;
  void fetch("/api/metrics/ping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId: getSessionId(), event }),
    keepalive: true,
  }).catch(() => {});
}
