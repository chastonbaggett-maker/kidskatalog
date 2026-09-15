# Profit handoff — revert point

Created 2026-09-14 before Parent Mode / affiliate-strip work.

## Snapshot

| Item | Value |
|---|---|
| Annotated tag | `pre-profit-handoff-2026-09-14` |
| Commit SHA | `27bdd5cbff949b84dd3d87812eb61657e49add9f` |
| Backup branch | `backup/pre-profit-handoff-2026-09-14` |
| Default branch at tag | `main` @ that SHA (`Fix ThumbCarousel strokeLinecap type error for Vercel builds.`) |
| Vercel production (at handoff) | https://kidskatalog.vercel.app — last **production** promote was `ceac22e8552a1aa1fb0ca56fcc12824e1e2cb0f6` (PR 16). Main tip and that promote SHA differ. |

## How to revert

Restore the tagged commit, then redeploy that SHA on Vercel Production:

```bash
git fetch --tags origin
git checkout pre-profit-handoff-2026-09-14
```

Same tree on a branch:

```bash
git checkout backup/pre-profit-handoff-2026-09-14
```

Then in Vercel: promote / redeploy commit `27bdd5cbff949b84dd3d87812eb61657e49add9f`.

## Money path (after this handoff ships)

- Kids: shop / toy / kart / watch — **no** Amazon `tag=` or product buy URLs.
- Parents: `/p/{id}` and `/p?ids=…` — Buy opens a **placeholder** confirmation (`/p/buy-placeholder?toy=ID#buy-placeholder`) until Associates is approved.
- Flip later (no redesign): set `AMAZON_ASSOCIATES_LIVE=true` and `AMAZON_ASSOCIATES_TAG`, plus per-toy `affiliateUrl`. `resolveParentBuy()` is the only swap. Runbook: `docs/associates-flip.md`. Do not set those env vars until Associates is approved.
- Print/QRs/share point at Parent Mode pages, not Amazon. Share origin is `NEXT_PUBLIC_SITE_URL` or `https://kidskatalog.vercel.app` — never the unconfigured `kidskatalog.app` host. Kart share is the `/p?ids=` link only (copy + Open Parent Mode). **No PDF / email-PDF.**
- Parent funnel (views / Buy / wish list / brand-deal clicks): `POST /api/events`, how to read it in `docs/parent-funnel.md`.
- Kart **Send to Mom or Dad** builds a shareable `/p?ids=id1,id2` wish list (copy + Open Parent Mode). Small **For parents** entry → `/p/deals`. Not kid-primary.
- Parent accounts (Parent Mode only): sign up / log in, **Save list**, **My lists**. See `docs/parent-auth.md`. Clerk keys optional (`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`); password accounts work until those are set. Do not force kids to log in.
- Brand deals (parent-only): `/p/deals` and per-toy CTA when `brandDeal` / `brandDealUrl` / `brandPartner` is set. Not Amazon. Kids never see it. See `docs/brand-deals.md`. Outreach templates (do not send): `docs/brand-outreach.md`.

Do not delete tag `pre-profit-handoff-2026-09-14`.
