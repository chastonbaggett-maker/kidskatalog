# Associates links

Parent Buy hrefs are built at render time from the toy ASIN and `AMAZON_ASSOCIATES_TAG`. There is no hard-coded tag and no `/p/buy-placeholder` page.

Stored `affiliateUrl` values can remain in the catalog. They are not rendered as the Buy href.

## Public behavior

- `/` is the parent catalog. Each live toy card includes `<a href="https://www.amazon.com/dp/{ASIN}?tag={TAG}" rel="sponsored noopener">Buy on Amazon</a>` in the raw HTML.
- Disclosure, exact sentence: `As an Amazon Associate I earn from qualifying purchases.` It sits next to Buy and in the parent footer.
- Kid Mode (`/shop`, `/toy`, `/kart`, `/menu`, `/profile`, kid catalog APIs) has no Buy buttons, prices, `amazon.com` store URLs, or `tag=`.
- A device with cookie `kk_mode=kid` that opens `/` sees Kid Mode. Leaving Kid Mode uses the birth-year gate (1901–2008). The year is not stored. Entering Parent Mode needs no gate.
- `www.kidskatalog.com` and `kidskatalog.vercel.app` 301 to `https://kidskatalog.com`. Preview `*.vercel.app` hosts are not redirected.
- Old `/p/buy-placeholder` and `/api/buy-placeholder` URLs 301 to `/p/{toy}` or `/`.

Do not put the tag in a `NEXT_PUBLIC_` variable. Do not change the admin approval queue: Submit Approval stays a human PIN action.

QR codes are not generated in this repo. Printed codes should target `https://kidskatalog.com/p/{id}`.
