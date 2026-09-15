# Brand deals (parent-only)

## Pitch (one line)

Toy brands: give KidsKatalog video permission, get a featured Watch card plus a parent-only partner CTA — better % than Amazon Associates, kids never see a buy button.

## What we need from a brand

- Written video permission (or brand-supplied clip) for the Watch / video card.
- A parent landing URL that is **not** Amazon (your store, retailer, or campaign page).
- Partner name for the parent disclosure.
- Confirmation that KidsKatalog may earn a commission on that parent click.

No spend from us. No outreach emails are sent from this doc.

## Where money sits

| Path | Program | Kid Mode |
|---|---|---|
| `/p/{id}` **Buy on Amazon** | Amazon Associates (mass catalog). Placeholder until Associates is approved. | Hidden |
| `/p/deals` + per-toy **Brand partner link** | Custom brand deal (video permission + featured video card + parent CTA) | Hidden |

Do **not** put Amazon Product Advertising Content on a card that sells off-Amazon. Do **not** claim Amazon and another program on the same click.

## Data fields (optional on every product)

- `brandDeal` — flag; default unset/false
- `brandDealUrl` — external partner URL; empty = “coming soon”
- `brandPartner` — name for disclosure

Existing toys stay unchanged until a field is set. Demo seeds: `sky-rocket` (coming soon) and `roar-rex` (example.com placeholder).

## FTC

Parent pages must say this click is a brand partner link, **not Amazon**. Amazon Associates disclosure stays on the Amazon Buy control only. Kid surfaces must never include `tag=`, `amazon.com/dp`, Buy, or brand-deal fields.
