# Associates flip runbook

Parent Mode **Buy** always opens `https://www.amazon.com/dp/{ASIN}?tag=kidskatalog-20` when the toy has an ASIN. Kid Mode stays commerce-free.

The tag is locked to **`kidskatalog-20`**. `AMAZON_ASSOCIATES_LIVE` and `AMAZON_ASSOCIATES_TAG` do not change the Parent Buy href.

## Swap point in code

`resolveParentBuy()` in `src/lib/associates.ts` builds the Parent Buy href from the stored `affiliateUrl` / ASIN and always attaches `tag=kidskatalog-20`. Kid catalog payloads still go through `toKidToy()` and must never include `tag=` or `affiliateUrl`.

## Steps

1. Confirm Associates approval in Amazon Associates Central (account in good standing, site listed, Special Links allowed).
2. Confirm production loads: https://kidskatalog.vercel.app (or `NEXT_PUBLIC_SITE_URL` if you have pointed it at a **working** host). Do not use `kidskatalog.app` until DNS actually answers.
3. In each toy you will sell, confirm a stored `affiliateUrl` (Amazon `dp` / ASIN). Import/admin already writes this server-side. Without an ASIN, Buy stays on `/p/buy-placeholder`.
4. Deploy the build that includes this `resolveParentBuy()` behavior. Env vars are not the switch.
5. Verify Parent Buy:
   - Open `/p/sky-rocket` (or any live toy), pass the birth-year gate
   - **Buy on Amazon** `href` is `https://www.amazon.com/dp/B0BBRGJTD7?tag=kidskatalog-20` — **not** `/p/buy-placeholder`
   - Click opens Amazon in the system browser. Confirm the address bar includes `tag=kidskatalog-20`
   - Placeholder copy (“Associates link goes here when approved”) is gone; FTC Associates disclosure remains next to Buy
6. Verify Kid Mode is still clean (no redesign, no commerce):
    - `/shop`, `/toy/{id}`, `/kart`, `/watch`, `/menu`
    - No “Buy on Amazon”, no `tag=`, no `amazon.com/dp`, no brand-deal CTA
7. Optional: `GET /api/parent/buy-urls?ids=sky-rocket` should return `https://www.amazon.com/dp/B0BBRGJTD7?tag=kidskatalog-20`. `GET /api/catalog` must still omit `affiliateUrl` and `tag=`.
8. Spot-check `/p/deals`: brand-deal CTAs stay **not Amazon**. Do not put Product Advertising Content on a partner card.

## Rollback

Unsetting `AMAZON_ASSOCIATES_LIVE` does **not** put Buy back on the placeholder. To roll back, redeploy a commit from before this href change. Kid surfaces stay free of `tag=` either way.

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

If a kid surface shows `tag=` or a Buy button, fix that leak before sending traffic.
