# KidsKatalog

A kid-friendly virtual toy catalog — browse, save favorites to a **Kart**, and email mom or dad a PDF with affiliate buy links. Nothing is sold on the site.

## Features

- Big, simple browse UI with category “piles”
- Toy detail pages with one-tap **Add to Kart**
- Persistent Kart (saved in the browser)
- **Send to Mom or Dad** — emails a PDF + HTML list of affiliate links (via [Resend](https://resend.com))

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
