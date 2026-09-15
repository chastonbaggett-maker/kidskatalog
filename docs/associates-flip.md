# Associates flip runbook

Do this only when **(a)** Amazon Associates is approved for the KidsKatalog account and **(b)** the public site is fully up on a working host. Until then, Parent Mode **Buy** stays on `/p/buy-placeholder`. Kid Mode stays commerce-free either way.

This runbook does **not** contain secrets, tags, or API keys. Do not paste production values into git, issues, or chat logs.

## Do not flip from this repo / agent

Do **not** set `AMAZON_ASSOCIATES_LIVE` or `AMAZON_ASSOCIATES_TAG` on Vercel until Chaston does it by hand after approval. The code already reads those names; leaving them unset keeps Buy on the placeholder.

## Swap point in code

`resolveParentBuy()` in `src/lib/associates.ts` is the only Buy URL switch. Per-toy `affiliateUrl` / ASIN is used only when live. Kid catalog payloads still go through `toKidToy()` and must never include `tag=` or `affiliateUrl`.

## Steps

1. Confirm Associates approval in Amazon Associates Central (account in good standing, site listed, Special Links allowed).
2. Confirm production loads: https://kidskatalog.vercel.app (or `NEXT_PUBLIC_SITE_URL` if you have pointed it at a **working** host). Do not use `kidskatalog.app` until DNS actually answers.
3. In each toy you will sell, confirm a stored `affiliateUrl` (Amazon `dp` / ASIN). Import/admin already writes this server-side. Live mode cannot build a Special Link without it.
4. Open [Vercel](https://vercel.com) → KidsKatalog project → **Settings** → **Environment Variables**.
5. Add **`AMAZON_ASSOCIATES_LIVE`**
   - Value: `true`
   - Environments: Production, Preview, and Development (all three, so preview deploys match prod behavior when you are testing the flip)
6. Add **`AMAZON_ASSOCIATES_TAG`**
   - Value: your Associates tracking id only (the `tag=` value, not a full URL)
   - Environments: Production, Preview, and Development
   - Do not also put this value in `NEXT_PUBLIC_*` event payloads or client bundles
7. Save. Env changes apply on the **next deployment**, not on the current one.
8. Redeploy Production (Deployments → Production → Redeploy, or push an empty commit / redeploy from Git). Wait until the deployment is **Ready**.
9. Verify Buy left the placeholder:
   - Open `/p/sky-rocket` (or any live toy) in a logged-out / incognito window
   - **Buy on Amazon** `href` is `https://www.amazon.com/dp/{ASIN}?tag={your-tag}` — **not** `/p/buy-placeholder`
   - Click opens Amazon in the system browser (Special Link). Confirm the address bar includes your tag
   - Placeholder copy (“Associates link goes here when approved”) is gone; FTC Associates disclosure remains next to Buy
10. Verify Kid Mode is still clean (no redesign, no commerce):
    - `/shop`, `/toy/{id}`, `/kart`, `/watch`, `/menu`
    - No “Buy on Amazon”, no `tag=`, no `amazon.com/dp`, no brand-deal CTA
11. Optional: `GET /api/parent/buy-urls?ids=sky-rocket` should return the Special Link, not the placeholder path. `GET /api/catalog` must still omit `affiliateUrl` and `tag=`.
12. Spot-check `/p/deals`: brand-deal CTAs stay **not Amazon**. Do not put Product Advertising Content on a partner card.

## Rollback

Fastest safe rollback (Buy returns to placeholder, kids unchanged):

1. Vercel → Environment Variables → **`AMAZON_ASSOCIATES_LIVE`**
2. Either **delete** it, or set the value to `false`
3. You may leave `AMAZON_ASSOCIATES_TAG` in place (unused when LIVE is off)
4. Redeploy Production and wait for **Ready**
5. Confirm `/p/{id}` Buy href matches `/p/buy-placeholder?toy=` again and kid surfaces still have no `tag=`

No catalog wipe. No DNS change. Tag `pre-profit-handoff-2026-09-14` is unrelated to this flip — do not delete it.

## FTC / Associates disclosure checklist

Complete before and after the flip. Parent pages already include the Associates Program paragraph; keep it visible beside Buy.

- [ ] Site discloses participation in the **Amazon Services LLC Associates Program** in plain language near the Buy control (not only in a buried footer).
- [ ] Copy states that **as an Amazon Associate we earn from qualifying purchases**.
- [ ] Disclosure is on **every** parent surface that can start a Buy (`/p/{id}`, `/p?ids=`).
- [ ] After flip, placeholder-only sentences are gone; the paid-relationship disclosure **stays**.
- [ ] Special Links use the **approved** Associates tag for this site; no other network’s tag on the Amazon Buy click.
- [ ] Brand-deal CTAs are labeled as a **brand partner** link, **not Amazon**, and never share the Amazon Buy click.
- [ ] Kid Mode has **no** affiliate URLs, Buy buttons, or partner CTAs (FTC + Associates: advertising content is for the appropriate audience / placement).
- [ ] Do not imply Amazon endorses KidsKatalog or the toys.
- [ ] Material connection is clear **before** the parent clicks Buy (FTC Endorsement Guides / 16 CFR 255).
- [ ] Emails and print/QR still send parents to **Parent Mode pages**, not raw Amazon URLs from kid surfaces. Kart share is the `/p?ids=` link only (no PDF).
- [ ] If Associates policy or the site URL in the Associates application changes, update the application **before** driving traffic.

If any box fails, keep `AMAZON_ASSOCIATES_LIVE` unset/false.
