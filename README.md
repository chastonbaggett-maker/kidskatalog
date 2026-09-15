# KidsKatalog

A kid-friendly virtual toy catalog — browse, save favorites to a **Kart**, and email mom or dad a PDF. Kids never see buy links. Grown-ups buy in **Parent Mode** (`/p/{id}`).

**Revert point:** see [`HANDOFF.md`](./HANDOFF.md) (`pre-profit-handoff-2026-09-14`).

## Features

- Big, simple browse UI with category “piles”
- Toy detail pages with one-tap **Add to Kart**
- Persistent Kart (saved in the browser)
- **Send to Mom or Dad** — emails a PDF + Parent Mode links (via [Resend](https://resend.com))
- **Parent Mode** (`/p/{id}`) — wish list + Buy placeholder (Associates Special Links stay off until approved)
- **Brand deals** (`/p/deals`) — parent-only partner CTAs, not Amazon (see `docs/brand-deals.md`)

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
| `NEXT_PUBLIC_AFFILIATE_TAG` | Amazon Associates tag on product links |

## Stack

Next.js (App Router) · React · Tailwind CSS · Zustand · jsPDF · Resend
