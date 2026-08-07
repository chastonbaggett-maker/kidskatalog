import "server-only";
import { readStore, writeStore } from "@/lib/json-store";

export type MetricsData = {
  version: number;
  totalVisits: number;
  totalSessions: number;
  sessionIds: string[];
  dailyVisits: Record<string, number>;
  kartAdds: number;
  kartEmailsSent: number;
  crazyModeActivations: number;
};

const DEFAULT_METRICS: MetricsData = {
  version: 1,
  totalVisits: 0,
  totalSessions: 0,
  sessionIds: [],
  dailyVisits: {},
  kartAdds: 0,
  kartEmailsSent: 0,
  crazyModeActivations: 0,
};

const MAX_SESSION_IDS = 5000;

/** Dev-only in-memory metrics — avoids writing data/metrics.json under `next dev`. */
let devMetricsMemory: MetricsData | null = null;

async function loadMetrics(): Promise<MetricsData> {
  if (process.env.NODE_ENV === "development" && devMetricsMemory) {
    return devMetricsMemory;
  }
  const data = await readStore("metrics", DEFAULT_METRICS);
  if (process.env.NODE_ENV === "development") {
    devMetricsMemory = data;
  }
  return data;
}

async function saveMetrics(data: MetricsData): Promise<void> {
  // In `next dev`, writing into data/ trips the file watcher and hot-reloads CSS
  // (brief unstyled-text FOUC) on every kart_add ping. Keep memory-only there.
  if (process.env.NODE_ENV === "development") {
    devMetricsMemory = data;
    return;
  }
  await writeStore("metrics", data);
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export async function recordVisit(sessionId?: string): Promise<void> {
  const data = await loadMetrics();
  data.totalVisits += 1;
  data.dailyVisits[todayKey()] = (data.dailyVisits[todayKey()] ?? 0) + 1;

  if (sessionId && !data.sessionIds.includes(sessionId)) {
    data.sessionIds.push(sessionId);
    if (data.sessionIds.length > MAX_SESSION_IDS) {
      data.sessionIds = data.sessionIds.slice(-MAX_SESSION_IDS);
    }
    data.totalSessions += 1;
  }

  await saveMetrics(data);
}

export async function incrementMetric(
  key: "kartAdds" | "kartEmailsSent" | "crazyModeActivations",
): Promise<void> {
  const data = await loadMetrics();
  data[key] += 1;
  await saveMetrics(data);
}

export async function getMetricsSummary() {
  const data = await loadMetrics();
  return {
    totalVisits: data.totalVisits,
    visitsToday: data.dailyVisits[todayKey()] ?? 0,
    uniqueSessions: data.totalSessions,
    kartAdds: data.kartAdds,
    kartEmailsSent: data.kartEmailsSent,
    crazyModeActivations: data.crazyModeActivations,
    dailyVisits: data.dailyVisits,
  };
}
