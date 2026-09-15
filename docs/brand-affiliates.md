# Brand affiliates (parent-only, not Amazon)

Multi-brand parent CTAs sit on a **different control** from **Buy on Amazon**. Kid Mode never shows them. Do **not** set `AMAZON_ASSOCIATES_LIVE` or `AMAZON_ASSOCIATES_TAG` as part of this work.

Demo overlays ship `live: false` (Yoto-style / KiwiCo-style labels). The parent button then reads **Brand partner link — coming soon**.

## Dual-claim rule (Amazon + brand)

KidsKatalog may earn from Amazon Associates **or** from a brand network. It must **not** claim both on the same click.

- Amazon Buy is only the **Buy on Amazon** control on `/p/{id}` (and wish-list rows).
- Brand CTAs are only the **Brand partner link** control on `/p/{id}` and `/p/deals`.
- Separate clicks only. Never one button, never one `href`, never Amazon Product Advertising Content on a partner card.
- A toy can have both programs listed. The parent chooses which link to open.

If a partner URL is Amazon (`dp` / `tag=` / amazon host), the brand CTA stays a placeholder.

## Data field

Optional overlay on each product:

```ts
brandAffiliate?: { partner?: string; network?: string; url?: string; live?: boolean }
```

Default: missing / empty / `live: false`. Existing Amazon-catalog toys stay unchanged until a partner is set.

| `live` | `url` | Parent CTA |
|---|---|---|
| false / unset | anything | **Brand partner link — coming soon** (not a link) |
| true | valid non-Amazon URL | **Brand partner link** opens that URL + not-Amazon disclosure |
| true | missing / Amazon | **Brand partner link — coming soon** |

Legacy `brandDeal` / `brandDealUrl` / `brandPartner` still flag the card. `brandAffiliate.live` is the only switch that turns the CTA into an outbound link.

## Flip steps (brand network — not Associates)

Do this per partner after a signed deal and a **non-Amazon** landing URL. This runbook does **not** flip Amazon Associates.

1. Confirm the agreement (commission + video permission as in `docs/brand-deals.md`).
2. Confirm the parent landing URL is **not** Amazon (brand store, Impact/CJ/etc. tracking link, or campaign page).
3. On the toy overlay / admin listing, set `brandAffiliate.partner` (disclosure name), `network` (e.g. `impact`, `cj`, `direct`), and `url`. Leave **`live: false`** first and check `/p/{id}` + `/p/deals`: coming-soon CTA, separate from Buy on Amazon.
4. Kid Mode check: `/shop`, `/toy/{id}`, `/kart`, `/watch`, `/menu`, and `GET /api/catalog` must omit `brandAffiliate` and must not say “Brand partner link”.
5. When the URL is real and approved, set **`live: true`** on that toy only. Redeploy if the catalog is baked; Turso/admin saves apply on the next read.
6. Verify `/p/{id}`: **Buy on Amazon** still goes to the Associates placeholder (until Chaston flips Associates by hand). **Brand partner link** is a second control, `href` is the partner URL, disclosure says **not Amazon**.
7. Verify `/p/deals`: partner card only — no Buy on Amazon on that click.
8. Do **not** set `AMAZON_ASSOCIATES_LIVE` or `AMAZON_ASSOCIATES_TAG`. See `docs/associates-flip.md` for that separate, later flip.

Rollback: set `live: false` (or clear `url`). Buy on Amazon is unchanged.

## Priority partners

Outreach order (templates in `docs/brand-outreach.md` — do not send from this repo):

1. **Yoto** — audio player / cards; Impact-style network likely.
2. **KiwiCo** — crates / kits.
3. **MEL Science** — STEM kits.
4. **Hape** — wood / early toys.
5. **Lovevery** — play kits / stages.

Demo UI labels today: **Yoto-style** on `sky-rocket`, **KiwiCo-style** on `roar-rex`. Those are placeholders, not live deals.

## Where it shows

| Surface | Brand CTA | Amazon Buy |
|---|---|---|
| `/p/{id}` | Yes, if overlay/fields set | Yes (placeholder until Associates) |
| `/p/deals` | Yes | No |
| Kid shop / toy / kart / watch | No | No |

FTC: parent pages must say the brand click is a **brand partner** link, **not Amazon**. Associates disclosure stays on the Amazon Buy control only.
