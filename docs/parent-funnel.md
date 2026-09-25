# Parent Mode money funnel

Lightweight, server-safe analytics for grown-up money paths. Kid Mode does not fire these events. Payloads never include emails, names, Amazon tags, or product URLs — only allowlisted event names and optional toy catalog ids.

There is no Vercel Analytics package in this app. Parent funnel uses the same fire-and-forget POST pattern as `/api/metrics/ping`, via **`POST /api/events`**.

## Events

| Event | When | Payload |
|---|---|---|
| `parent_toy_view` | Parent `/p/{id}` mounts | `{ name, toyId }` |
| `parent_buy_click` | **Buy on Amazon** (tagged Special Link) | `{ name, toyId, mode: "associates" }` |
| `parent_wishlist_view` | Shared wish list `/p?ids=` mounts with at least one toy | `{ name, toyCount }` |
| `parent_brand_deal_click` | Brand-deal CTA on `/p/deals` or `/p/{id}` | `{ name, toyId, source: "deals" \| "toy" }` |

Empty `/p` (no `ids`) does **not** count as a wish-list view. Coming-soon brand CTAs still count a click (interest) without opening a URL.

## How to read it

### 1. Totals (fastest)

```bash
curl -sS https://kidskatalog.com/api/events
```

Example:

```json
{
  "ok": true,
  "totals": {
    "parent_toy_view": 12,
    "parent_buy_click": 4,
    "parent_buy_click_placeholder": 4,
    "parent_buy_click_associates": 0,
    "parent_wishlist_view": 3,
    "parent_brand_deal_click": 1
  }
}
```

Funnel read:

1. **Wish list in** → `parent_wishlist_view`
2. **Toy page in** → `parent_toy_view`
3. **Intent to buy** → `parent_buy_click` (`mode: "associates"`)
4. **Brand-deal intent** → `parent_brand_deal_click` (not Amazon)

Admin → Metrics also shows the same Parent funnel cards (from `/api/admin/metrics`).

Counts live in the existing metrics store (Turso / Blob in production; memory-only under `next dev` so the file watcher does not FOUC). Totals can reset if the store is wiped — they are directional, not billing.

### 2. Per-event lines (Vercel logs)

Each accepted POST logs one JSON line:

```
[parent-funnel] {"name":"parent_buy_click","toyId":"sky-rocket","mode":"associates"}
```

In Vercel: Project → **Logs** → Runtime → filter `parent-funnel`. Use this when you need toy ids. The log line is the same allowlist as the POST body (no `tag=`, no Amazon URL).

## What is never stored

- Parent email, kid name, session cookies, IP
- Amazon Associates tag or `amazon.com/dp/…` URLs
- Brand-deal destination URLs
- Unknown JSON keys (stripped server-side)

Invalid payloads return `400` and are not counted.

## Local check

```bash
curl -sS -X POST http://localhost:3456/api/events \
  -H 'Content-Type: application/json' \
  -d '{"name":"parent_toy_view","toyId":"sky-rocket"}'
```

Then `GET /api/events` and confirm `parent_toy_view` incremented. Kid `/shop` and `/toy/{id}` must not POST `/api/events`.
