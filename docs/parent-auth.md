# Parent Mode accounts and saved lists

Parent Mode can **sign up / log in** and **save wish lists**. Kid Mode (`/shop`, `/toy`, `/kart`, `/watch`, `/menu`) never requires an account and stays commerce-free.

## What works today (no Clerk keys)

Email + password parent accounts. Sessions are an HttpOnly cookie (`kk_parent_session`). Lists persist in **Turso** when `TURSO_DATABASE_URL` + `TURSO_AUTH_TOKEN` are set (production), or in the JSON store locally.

| Surface | Auth |
|---|---|
| `/p?ids=` one-shot share | None. Anyone with the link can open it. |
| `/p/{id}` Buy on Amazon | None |
| Save list / My lists / `/p?list=` / `/p/lists/{id}` | Signed-in owner only |

## Clerk (preferred when keys exist)

Set these on Vercel (Production + Preview) and redeploy. Do **not** put secret keys in git.

| Variable | Where |
|---|---|
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `pk_live_…` or `pk_test_…` from [Clerk API keys](https://dashboard.clerk.com/~/api-keys) |
| `CLERK_SECRET_KEY` | `sk_live_…` or `sk_test_…` |

Optional Clerk URLs (already the defaults in code):

- `NEXT_PUBLIC_CLERK_SIGN_IN_URL=/p/sign-in`
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL=/p/sign-up`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/p`
- `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/p`

When those publishable + secret keys are present, `/p/sign-in` and `/p/sign-up` render Clerk components instead of the password form. Kid routes are **not** in the Clerk proxy matcher.

Until Clerk keys are set, the password form is the live Parent Mode sign-up path so lists can be saved.

## Other env

| Variable | Purpose |
|---|---|
| `PARENT_SESSION_SECRET` | HMAC for password sessions. Falls back to `ADMIN_SESSION_SECRET`, then a dev default. Set a long random string in production. |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Saved lists + parent accounts (recommended) |

Do **not** set `AMAZON_ASSOCIATES_LIVE` or `AMAZON_ASSOCIATES_TAG` from this work.

## Flip a Clerk app

1. Create a Clerk application (email sign-up is enough).
2. Add the two keys on Vercel → Environment Variables → all environments.
3. In Clerk, allow redirect URLs for `https://kidskatalog.vercel.app/p/sign-in` and `/p/sign-up` (plus localhost for preview).
4. Redeploy. Confirm `/p/sign-up` shows Clerk, not the password form.
5. Existing password accounts stay in Turso; they are a different `owner_id` namespace than Clerk `user_…` ids. Do not mix them on one list.

## Share vs saved

- Kart **Send to Mom or Dad** copies `/p?ids=id1,id2` and opens Parent Mode. **No PDF. No email.**
- **Save list** stores toy ids for the signed-in parent. Reopen from **My lists** or `/p?list=<id>` / `/p/lists/<id>`.
