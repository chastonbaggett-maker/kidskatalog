# Parent site and Kids site

One codebase. Two deployments. `SITE_MODE` selects the site. When `SITE_MODE` is unset, the hostname does: `kidskatalog.app` (and any subdomain) is the kids site, and so is any host label that is `kids`, starts with `kids-`, or contains `-kids`. The brand host `kidskatalog.com` stays the parent site.

## Parent deployment (kidskatalog.com)

```
SITE_MODE=parent
PARENT_ORIGIN=https://kidskatalog.com
KIDS_ORIGIN=https://<kids-deployment-host>
AMAZON_ASSOCIATES_TAG=kidskatalog-20
```

`/` is the parent catalog. A request never renders Kid Mode, including when `kk_mode` is set. Old kid paths (`/shop`, `/toy/*`, `/kart`, `/menu`, `/profile`, `/pair/*`) redirect to `KIDS_ORIGIN`. Printed `/p/{id}` links stay here. Set up Kid Mode from `/p/lists`. Claim a child's code at `/claim/{code}`.

Leave the existing production env values in place until you are ready to point redirects at the kids host. Adding `KIDS_ORIGIN` is the only parent-project change required for those redirects.

## Kids deployment (KidsKatalog.app, or a temporary Vercel URL)

Create a second Vercel project from this same repo and branch. Do not merge. Suggested settings:

```
SITE_MODE=kids
PARENT_ORIGIN=https://kidskatalog.com
KIDS_ORIGIN=https://<this-deployment-host>
```

Copy the catalog store (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, and `BLOB_READ_WRITE_TOKEN` if toy photos live in Blob) so the kids site can read the same toys. Do not copy Clerk keys. The kids site does not render Buy links, prices, Amazon media, analytics, or Clerk.

When the kids URL exists, set that exact origin as `KIDS_ORIGIN` on the parent project (preview first, production when you want kidskatalog.com to redirect). Swapping to `https://kidskatalog.app` later is only those two origin env vars plus `SITE_MODE=kids` on the kids project.

Unpaired Karts stay on the device (toy ids only). Show a grown-up creates a code for `PARENT_ORIGIN/claim/{code}`. `/pair/{token}` stores an opaque device credential and syncs Kart adds and removes onto the parent's "Paired device" list. Leaving or unpairing asks for a birth year and does not store the year.

The kids site sends `X-Robots-Tag: noindex` and a robots file that disallows `/`. The PWA manifest name is `KidsKatalog Kids`.
