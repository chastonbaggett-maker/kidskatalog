# Toy approval queue

Auth-gated queue for proposed toy cards. Approve stages. Reject drops (audit kept in Rejected). **Submit Approval** is the only publish to the live kid catalog and parent `/p/{id}` pages.

Sacred revert tag: `pre-profit-handoff-2026-09-14`. This work does not restyle kid or parent craft.

## Admin URL

- **https://kidskatalog.com/admin/toys** (PIN session required; unauthenticated visits redirect to `/admin`)
- PIN pad: **https://kidskatalog.com/admin** (also the hidden admin overlay from the kid logo taps)
- Preview/local: `/admin/toys` on the same origin (dev: http://localhost:3456/admin/toys)

Unauthenticated visits never see the queue. There is no public queue.

Pending list: **Approve** (stages) / **Reject** (drops, kept under Rejected). Sticky **Submit Approval** batch-publishes **staged** cards only (browser confirm). Tabs: Pending | Staged | Published | Rejected.

## Ingest a proposal

Chief/bots drop cards after Amazon search.

`POST /api/admin/toy-proposals`

Auth (either):

1. Admin PIN session cookie (`POST /api/admin/auth` with `{ "action": "verify", "pin": "••••" }`)
2. Bearer ingest key when `ADMIN_INGEST_KEY` (or `ADMIN_API_KEY`) is set

Batch max **25**. `asin` **or** `amazon_url` is required. Duplicate ASINs (live catalog, pending, staged, or published) are skipped. Rejected ASINs may be re-ingested.

```bash
curl -sS -X POST https://kidskatalog.com/api/admin/toy-proposals \
  -H "Authorization: Bearer $ADMIN_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "source": "chief",
    "source_ref": "amazon-search-magnetic-tiles",
    "proposals": [
      {
        "name": "Mag Tiles",
        "images": ["https://example.com/toy.jpg"],
        "blurb": "Click-together building squares.",
        "age": "4-8",
        "category": "blocks",
        "asin": "B07YNLXJ4L",
        "amazon_url": "https://www.amazon.com/dp/B07YNLXJ4L",
        "affiliate_url": "https://www.amazon.com/dp/B07YNLXJ4L",
        "notes": "Amazon search: magnetic tiles ages 4-8"
      }
    ]
  }'
```

Same payload works as a single object, an array, or `{ "proposals": [ ... ] }`. Envelope `source` / `source_ref` apply to every item unless the item overrides them.

| Field | Notes |
|---|---|
| `name` | Required |
| `images` / `image` | URL string, list, or newline-separated. Amazon `/dp/` buy URLs are dropped so kid HTML cannot leak them |
| `blurb` | Optional short card copy |
| `age` | `"8-12"`, `"5+"`, `8`, or `{ "min": 4, "max": 8 }` |
| `category` | `dinos` `plush` `cars` `blocks` `outside` `games` `stem` `pretend` (aliases like `dinosaur` work) |
| `asin` **or** `amazon_url` | Required. Bare ASIN or Amazon `/dp/` URL |
| `affiliate_url` | Optional proposed affiliate link; stored Parent Buy URL always uses tag `kidskatalog-20` |
| `notes` | Search notes for admins; never shown in Kid Mode |
| `source` / `source_ref` | Ingest provenance; never shown in Kid Mode |

Stored `affiliateUrl` always uses Associates tag **`kidskatalog-20`** for the later Parent Buy flip. Public Parent Buy still goes through `resolveParentBuy()` and **does not emit `tag=` until `AMAZON_ASSOCIATES_LIVE` is on.**

The admin **Ingest proposal** form on `/admin/toys` posts to the same path.

`GET /api/admin/toy-proposals?status=pending|staged|published|rejected` lists the queue (PIN session or ingest key). Omit `status` for all rows.

## Approve / Reject / Submit Approval

Approve, Reject, and Submit Approval require a PIN session (ingest key cannot publish).

| Action | Endpoint | Effect |
|---|---|---|
| **Approve** | `POST /api/admin/toy-proposals/:id/approve` | Stages the card. Not live. |
| **Reject** | `POST /api/admin/toy-proposals/:id/reject` | Drops the card from Pending/Staged. Audit row stays in Rejected. |
| **Submit Approval** | `POST /api/admin/toy-proposals/submit` | **Only publish path.** Publishes **staged** cards to the live catalog + `/p/{id}`. Pending ids are skipped. Published rows stay in the Published tab. |

Amazon generate / bulk-add still land in this queue as **pending**. They do not go live until Approve + Submit Approval.

`POST /api/admin/toys` no longer creates live toys. Edit live cards with `PATCH`; add new cards through the queue.

## Counsel publish locks (baked in)

1. Affiliate disclosure is visible next to Buy on every parent `/p/{id}` (placeholder **and** live tag). Test id: `associates-disclosure` inside `parent-buy-cluster`.
2. `tag=kidskatalog-20` appears on Parent Buy hrefs **only** when `AMAZON_ASSOCIATES_LIVE` is on. Until then Buy stays `/p/buy-placeholder`.
3. Kid Mode (`/shop`, `/toy/{id}`, `/kart`, `/watch`, `/menu`, `GET /api/catalog`) never gets `tag=`, Amazon Buy, or `amazon.com/dp` Buy UI.
4. Brand deal is a separate tap from Amazon Buy (existing `BrandDealCta`).
5. Submit Approval runs `assertLiveToyPublishable()` before insert, so the first published batch stays kid-HTML clean for Patch re-scan.

Do not set `AMAZON_ASSOCIATES_LIVE` or `AMAZON_ASSOCIATES_TAG` from this work. Flip runbook: `docs/associates-flip.md`.
