/**
 * Parent Mode money-funnel events. Allowlisted fields only — no PII,
 * no Amazon tags, no URLs. Toy catalog ids are the only product key.
 */

export const PARENT_FUNNEL_EVENTS = [
  "parent_toy_view",
  "parent_buy_click",
  "parent_wishlist_view",
  "parent_brand_deal_click",
] as const;

export type ParentFunnelEventName = (typeof PARENT_FUNNEL_EVENTS)[number];

export type ParentBuyClickMode = "placeholder" | "associates";
export type ParentBrandDealSource = "toy" | "deals";

export type ParentFunnelEvent = {
  name: ParentFunnelEventName;
  toyId?: string;
  toyCount?: number;
  mode?: ParentBuyClickMode;
  source?: ParentBrandDealSource;
};

export type ParentFunnelTotals = {
  parent_toy_view: number;
  parent_buy_click: number;
  parent_buy_click_placeholder: number;
  parent_buy_click_associates: number;
  parent_wishlist_view: number;
  parent_brand_deal_click: number;
};

export const EMPTY_PARENT_FUNNEL: ParentFunnelTotals = {
  parent_toy_view: 0,
  parent_buy_click: 0,
  parent_buy_click_placeholder: 0,
  parent_buy_click_associates: 0,
  parent_wishlist_view: 0,
  parent_brand_deal_click: 0,
};

const EVENT_SET = new Set<string>(PARENT_FUNNEL_EVENTS);
const TOY_ID_RE = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,79}$/;

function asToyId(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const id = value.trim();
  if (!TOY_ID_RE.test(id)) return undefined;
  return id;
}

export function sanitizeParentFunnelEvent(input: unknown): ParentFunnelEvent | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const raw = input as Record<string, unknown>;
  if (typeof raw.name !== "string" || !EVENT_SET.has(raw.name)) return null;

  const event: ParentFunnelEvent = { name: raw.name as ParentFunnelEventName };

  const toyId = asToyId(raw.toyId);
  if (toyId) event.toyId = toyId;

  if (typeof raw.toyCount === "number" && Number.isFinite(raw.toyCount)) {
    const count = Math.floor(raw.toyCount);
    if (count >= 0 && count <= 500) event.toyCount = count;
  }

  if (raw.mode === "placeholder" || raw.mode === "associates") {
    event.mode = raw.mode;
  }

  if (raw.source === "toy" || raw.source === "deals") {
    event.source = raw.source;
  }

  if (event.name === "parent_toy_view" && !event.toyId) return null;
  if (event.name === "parent_buy_click" && !event.toyId) return null;
  if (event.name === "parent_brand_deal_click" && !event.toyId) return null;

  return event;
}

export function applyParentFunnelEvent(
  totals: ParentFunnelTotals,
  event: ParentFunnelEvent,
): ParentFunnelTotals {
  const next = { ...totals };
  next[event.name] += 1;
  if (event.name === "parent_buy_click") {
    if (event.mode === "associates") next.parent_buy_click_associates += 1;
    else next.parent_buy_click_placeholder += 1;
  }
  return next;
}
