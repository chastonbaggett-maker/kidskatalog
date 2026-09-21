# Toy approval queue

Auth-gated queue for proposed toy cards. Approve stages. Reject drops. **Submit Approval** is the only publish to the live kid catalog and parent `/p/{id}` pages.

Sacred revert tag: `pre-profit-handoff-2026-09-14`. This work does not restyle kid or parent craft.

## Admin URL

- **https://kidskatalog.com/admin** (PIN-gated; also the hidden admin overlay from the kid logo taps)
- Preview/local: `/admin` on the same origin (dev: http://localhost:3456/admin)

Unauthenticated visits show the existing admin PIN pad. There is no public queue.

## Ingest a proposal

Chief/bots drop cards after Amazon search.

`POST /api/admin/proposals`

Auth (either):

1. Admin PIN session cookie (`POST /api/admin/auth` with `{ "action": "verify", "pin": "••••" }`)
2. Bearer ingest key when `ADMIN_INGEST_KEY` (or `ADMIN_API_KEY`) is set:

```bash
curl -sS -X POST https://kidskatalog.com/api/admin/proposals \
  -H "Authorization: Bearer $ADMIN_INGEST_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Mag Tiles",
    "blurb": "Click-together building squares.",
    "images": ["https://example.com/toy.jpg"],
    "age": "4-8",
    "category": "blocks",
    "amazonUrl": "https://www.amazon.com/dp/B07YNLXJ4L",
    "affiliateUrl": "https://www.amazon.com/dp/B07YNLXJ4L",
    "sourceNotes": "Amazon search: magnetic tiles ages 4-8"
  }'
```

Same payload works as a single object or `{ "proposals": [ ... ] }`.

| Field | Notes |
|---|---|
| `name` | Required |
| `images` / `image` | URL string, list, or newline-separated. Amazon `/dp/` buy URLs are dropped so kid HTML cannot leak them |
| `blurb` | Optional short card copy |
| `age` | `"8-12"`, `"5+"`, `8`, or `{ "min": 4, "max": 8 }` |
| `category` | `dinos` `plush` `cars` `blocks` `outside` `games` `stem` `pretend` (aliases like `dinosaur` work) |
| `amazonUrl` / `asin` / `amazon` | Amazon ASIN or `/dp/` URL |
| `affiliateUrl` | Optional proposed affiliate link; stored with tag `kidskatalog-20` |
| `sourceNotes` | Search notes for admins; never shown in Kid Mode |

Stored `affiliateUrl` always uses Associates tag **`kidskatalog-20`** for the later Parent Buy flip. Public Parent Buy still goes through `resolveParentBuy()` and **does not emit `tag=` until `AMAZON_ASSOCIATES_LIVE` is on.**

The admin **Ingest proposal** form on `/admin` posts to the same path.

`GET /api/admin/proposals` lists the queue (PIN session or ingest key).

## Approve / Reject / Submit Approval

All three require a PIN session (ingest key cannot publish).

| Action | Endpoint | Effect |
|---|---|---|
| **Approve** | `POST /api/admin/drafts/approve` `{ "id": "…" }` | Stages the card. Not live. |
| **Reject** | `POST /api/admin/drafts/reject` `{ "id": "…" }` | Drops the card from the queue. |
| **Submit Approval** | `POST /api/admin/drafts/submit-approval` `{}` | Publishes **approved** cards to the live catalog + `/p/{id}`. Unapproved ids are skipped. |

Amazon generate / bulk-add still land in this queue as **proposed**. They do not go live until Approve + Submit Approval.

`POST /api/admin/toys` no longer creates live toys. Edit live cards with `PATCH`; add new cards through the queue.

## Counsel publish locks (baked in)

1. Affiliate disclosure is visible next to Buy on every parent `/p/{id}` (placeholder **and** live tag). Test id: `associates-disclosure` inside `parent-buy-cluster`.
2. `tag=kidskatalog-20` appears on Parent Buy hrefs **only** when `AMAZON_ASSOCIATES_LIVE` is on. Until then Buy stays `/p/buy-placeholder`.
3. Kid Mode (`/shop`, `/toy/{id}`, `/kart`, `/watch`, `/menu`, `GET /api/catalog`) never gets `tag=`, Amazon Buy, or `amazon.com/dp` Buy UI.
4. Brand deal is a separate tap from Amazon Buy (existing `BrandDealCta`).
5. Submit Approval runs `assertLiveToyPublishable()` before insert, so the first published batch stays kid-HTML clean for Patch re-scan.

Do not set `AMAZON_ASSOCIATES_LIVE` or `AMAZON_ASSOCIATES_TAG` from this work. Flip runbook: `docs/associates-flip.md`.
