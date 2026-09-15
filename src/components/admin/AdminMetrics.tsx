"use client";

import type { ParentFunnelTotals } from "@/lib/parent-funnel";

type MetricsSummary = {
  totalVisits: number;
  visitsToday: number;
  uniqueSessions: number;
  toysInCatalog: number;
  kartAdds: number;
  kartEmailsSent: number;
  crazyModeActivations: number;
  parentFunnel?: ParentFunnelTotals;
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
        { label: "Kart emails (legacy)", value: metrics.kartEmailsSent },
        { label: "Crazy mode", value: metrics.crazyModeActivations },
      ]
    : [];

  const funnel = metrics?.parentFunnel;
  const funnelCards = funnel
    ? [
        { label: "Parent toy views", value: funnel.parent_toy_view },
        { label: "Wish list views", value: funnel.parent_wishlist_view },
        { label: "Buy clicks", value: funnel.parent_buy_click },
        { label: "Buy placeholder", value: funnel.parent_buy_click_placeholder },
        { label: "Buy Associates", value: funnel.parent_buy_click_associates },
        { label: "Brand-deal clicks", value: funnel.parent_brand_deal_click },
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
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cards.map((card) => (
              <div key={card.label} className="admin-metric-card">
                <p className="admin-metric-card__value">{card.value.toLocaleString()}</p>
                <p className="admin-metric-card__label">{card.label}</p>
              </div>
            ))}
          </div>
          {funnelCards.length > 0 ? (
            <>
              <h4 className="mb-2 mt-4 text-sm font-bold text-[var(--ink)]">
                Parent funnel
              </h4>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {funnelCards.map((card) => (
                  <div key={card.label} className="admin-metric-card">
                    <p className="admin-metric-card__value">
                      {card.value.toLocaleString()}
                    </p>
                    <p className="admin-metric-card__label">{card.label}</p>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </section>
  );
}

export type { MetricsSummary };
