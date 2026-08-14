"use client";

type MetricsSummary = {
  totalVisits: number;
  visitsToday: number;
  uniqueSessions: number;
  toysInCatalog: number;
  kartAdds: number;
  kartEmailsSent: number;
  crazyModeActivations: number;
};

type Props = {
  metrics: MetricsSummary | null;
  loading: boolean;
};

export function AdminMetrics({ metrics, loading }: Props) {
  const cards = metrics
    ? [
        { label: "Total visits", value: metrics.totalVisits },
        { label: "Visits today", value: metrics.visitsToday },
        { label: "Unique sessions", value: metrics.uniqueSessions },
        { label: "Toys in catalog", value: metrics.toysInCatalog },
        { label: "Kart adds", value: metrics.kartAdds },
        { label: "Kart emails", value: metrics.kartEmailsSent },
        { label: "Crazy mode", value: metrics.crazyModeActivations },
      ]
    : [];

  return (
    <section className="admin-panel__section p-4">
      <h3 className="mb-3 font-[family-name:var(--font-display)] text-lg font-bold text-[var(--ink)]">
        Metrics
      </h3>
      {loading ? (
        <p className="text-sm text-[var(--ink-soft)]">Loading metrics…</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {cards.map((card) => (
            <div key={card.label} className="admin-metric-card">
              <p className="admin-metric-card__value">{card.value.toLocaleString()}</p>
              <p className="admin-metric-card__label">{card.label}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export type { MetricsSummary };
