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
| `affiliate_url` | Optional. Stored Parent Buy URL is a tag-free `/dp/{ASIN}` link. The public tag is applied at render time. |
| `notes` | Search notes for admins; never shown in Kid Mode |
| `source` / `source_ref` | Ingest provenance; never shown in Kid Mode |

Stored `affiliateUrl` is a tag-free Amazon `/dp/{ASIN}` URL. Public Parent Buy goes through `resolveParentBuy()`, which rebuilds `https://www.amazon.com/dp/{ASIN}?tag=` from `AMAZON_ASSOCIATES_TAG` at render time.

The admin **Ingest proposal** form on `/admin/toys` posts to the same path.

`GET /api/admin/toy-proposals?status=pending|staged|published|rejected` lists the queue (PIN session or ingest key). Omit `status` for all rows.

## Queue craft with the ingest key

The same Bearer key used for ingest (`ADMIN_INGEST_KEY`, falling back to `ADMIN_API_KEY`) may clear or tidy a bad batch. It cannot stage or publish.

| Action | Endpoint | Auth |
|---|---|---|
| **Reject** | `POST /api/admin/toy-proposals/:id/reject` | PIN session **or** ingest key |
| **Reject batch** | `POST /api/admin/drafts/reject` with `{ "ids": ["…"] }` | PIN session **or** ingest key |
| **Edit pending** | `PATCH` or `PUT /api/admin/toy-proposals/:id` | PIN session **or** ingest key |

Reject drops **pending** and **staged** cards. The audit row stays in Rejected. Published rows cannot be rejected. Nothing is published.

Pending edits accept only `name`, `blurb`, and `images` (a string, a list, or newline/comma-separated text). Singular `image` is the same gallery input. Other fields return 400. Staged, published, and rejected rows return 409. Amazon `/dp/` buy URLs are dropped from images, same as ingest.

```bash
curl -sS -X POST "https://kidskatalog.com/api/admin/toy-proposals/$ID/reject" \
  -H "Authorization: Bearer $ADMIN_INGEST_KEY"

curl -sS -X POST https://kidskatalog.com/api/admin/drafts/reject \
  -H "Authorization: Bearer $ADMIN_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{"ids":["id-1","id-2"]}'

curl -sS -X PATCH "https://kidskatalog.com/api/admin/toy-proposals/$ID" \
  -H "Authorization: Bearer $ADMIN_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mag Tiles",
    "blurb": "Click-together building squares.",
    "images": ["https://example.com/toy.jpg"]
  }'
```

## Approve / Submit Approval stay PIN-only

The ingest key **cannot** call these. A valid Bearer token still gets **401**. A PIN session cookie from `POST /api/admin/auth` is required.

| Action | Endpoint | Effect |
|---|---|---|
| **Approve** | `POST /api/admin/toy-proposals/:id/approve` | Stages the card. Not live. |
| **Submit Approval** | `POST /api/admin/toy-proposals/submit` | **Only publish path.** Publishes **staged** cards to the live catalog + `/p/{id}`. Pending ids are skipped. Published rows stay in the Published tab. |

Also PIN-only: `POST /api/admin/drafts/approve`, `POST /api/admin/drafts/submit-approval`, `POST /api/admin/drafts/publish`, live toy writes on `/api/admin/toys`, and PIN management on `/api/admin/pins`.

Amazon generate / bulk-add still land in this queue as **pending**. They do not go live until Approve + Submit Approval.

`POST /api/admin/toys` no longer creates live toys. Edit live cards with `PATCH`; add new cards through the queue.

## Counsel publish locks (baked in)

1. Affiliate disclosure is visible next to Buy on every parent `/p/{id}`. Test id: `associates-disclosure` inside `parent-buy-cluster`.
2. Parent Buy hrefs use `AMAZON_ASSOCIATES_TAG` only. There is no placeholder Buy page.
3. Kid Mode (`/shop`, `/toy/{id}`, `/kart`, `/watch`, `/menu`, `GET /api/catalog`) never gets `tag=`, Amazon Buy, or `amazon.com/dp` Buy UI.
4. Brand deal is a separate tap from Amazon Buy (existing `BrandDealCta`).
5. Submit Approval runs `assertLiveToyPublishable()` before insert, so the first published batch stays kid-HTML clean for Patch re-scan.

Submit Approval stays human-only. Buy URL rules: `docs/associates-flip.md`.
