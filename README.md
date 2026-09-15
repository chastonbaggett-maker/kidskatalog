# KidsKatalog

A kid-friendly virtual toy catalog — browse, save favorites to a **Kart**, and email mom or dad a PDF. Kids never see buy links. Grown-ups buy in **Parent Mode** (`/p/{id}`).

**Revert point:** see [`HANDOFF.md`](./HANDOFF.md) (`pre-profit-handoff-2026-09-14`). Associates flip: [`docs/associates-flip.md`](./docs/associates-flip.md). Parent funnel: [`docs/parent-funnel.md`](./docs/parent-funnel.md).

## Features

- Big, simple browse UI with category “piles”
- Toy detail pages with one-tap **Add to Kart**
- Persistent Kart (saved in the browser)
- **Send to Mom or Dad** — copy/open a `/p?ids=` wish list, or email a PDF + Parent Mode links (via [Resend](https://resend.com))
- **Parent Mode** (`/p/{id}` and `/p?ids=…`) — wish list + Buy placeholder (Associates Special Links stay off until approved)
- **Brand deals** (`/p/deals`) — parent-only partner CTAs, not Amazon (see `docs/brand-deals.md`; outreach templates in `docs/brand-outreach.md`)

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Without `RESEND_API_KEY`, sending still generates/downloads the PDF locally (demo mode).

## Environment

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | Send parent emails |
| `RESEND_FROM_EMAIL` | Verified Resend from address |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin for parent share/email/QR (default `https://kidskatalog.vercel.app`) |
| `AMAZON_ASSOCIATES_LIVE` / `AMAZON_ASSOCIATES_TAG` | Off until Associates is approved — see `docs/associates-flip.md` |
| `NEXT_PUBLIC_AFFILIATE_TAG` | Stored import tag only; never shown on kid surfaces |

## Stack

Next.js (App Router) · React · Tailwind CSS · Zustand · jsPDF · Resend
