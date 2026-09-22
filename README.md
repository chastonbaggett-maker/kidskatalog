# KidsKatalog

A kid-friendly virtual toy catalog — browse, save favorites to a **Kart**, and send mom or dad a Parent Mode wish list link. Kids never see buy links. Grown-ups buy in **Parent Mode** (`/p/{id}`).

**Revert point:** see [`HANDOFF.md`](./HANDOFF.md) (`pre-profit-handoff-2026-09-14`). Associates flip: [`docs/associates-flip.md`](./docs/associates-flip.md). Brand affiliates: [`docs/brand-affiliates.md`](./docs/brand-affiliates.md). Parent funnel: [`docs/parent-funnel.md`](./docs/parent-funnel.md). Parent accounts: [`docs/parent-auth.md`](./docs/parent-auth.md). Toy approval queue: [`docs/toy-approval-queue.md`](./docs/toy-approval-queue.md).

## Features

- Big, simple browse UI with category “piles”
- Toy detail pages with one-tap **Add to Kart**
- Persistent Kart (saved in the browser)
- **Send to Mom or Dad** — copy/open a `/p?ids=` wish list (link only, no PDF)
- **Parent Mode** (`/p/{id}` and `/p?ids=…`) — wish list + Buy placeholder (Associates Special Links stay off until approved)
- **Approval queue** (`/admin/toys`, PIN) — ingest proposed toy cards, Approve / Reject, **Submit Approval** to publish. See [`docs/toy-approval-queue.md`](./docs/toy-approval-queue.md)
- **Parent sign up / log in** — save wish lists and reopen them from **My lists**
- **Brand deals** (`/p/deals`) — parent-only partner CTAs, not Amazon (see `docs/brand-deals.md` and `docs/brand-affiliates.md`; outreach templates in `docs/brand-outreach.md`)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3456](http://localhost:3456).

## Environment

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for parent share links (default `https://kidskatalog.vercel.app`) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | Optional Clerk for Parent Mode. Password sign-up works until these are set. See `docs/parent-auth.md` |
| `PARENT_SESSION_SECRET` | HMAC for password parent sessions (falls back to `ADMIN_SESSION_SECRET`) |
| `ADMIN_INGEST_KEY` | Optional Bearer token for proposal ingest, listing, pending `name` / `blurb` / `images` edits, and reject. Approve and Submit Approval stay PIN-only. `ADMIN_API_KEY` is the fallback name for the same secret |
| `AMAZON_ASSOCIATES_LIVE` / `AMAZON_ASSOCIATES_TAG` | Unused by Parent Buy. The href is always `tag=kidskatalog-20` — see `docs/associates-flip.md` |
| `NEXT_PUBLIC_AFFILIATE_TAG` | Stored import tag only; never shown on kid surfaces |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Catalog, metrics, parent accounts, and saved lists |

## Stack

Next.js (App Router) · React · Tailwind CSS · Zustand · Clerk (optional Parent Mode) · Turso
