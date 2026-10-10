---
name: nextjs16-conventions
description: Use before writing or changing any Next.js code in this repo — pages, layouts, route handlers, proxy.ts, next.config.ts, data fetching, caching, or Suspense boundaries.
---

# Next.js 16 conventions for this repo

This is Next.js **16.4** with React **19.3**. Much of what you remember about Next.js
(13–15) is outdated. If something you need is not covered here, read the doc listed
in the map below — do not write from memory.

## Facts that differ from older Next.js

- **`middleware.ts` is now `proxy.ts`** (repo root), exporting `function proxy(request)`
  plus `export const config = { matcher: [...] }`. It always runs on the Node.js
  runtime; setting `export const runtime` in proxy.ts **throws**.
- **Request APIs are async:** `await headers()`, `await cookies()`, `await params`,
  `await searchParams`. The sync form no longer exists.
- **`cacheComponents: true` is on** (see `next.config.ts`). Consequences:
  - Request-time work (DB queries, `headers()`, `cookies()`) must happen inside a
    component wrapped in `<Suspense>`, or the build fails. Pattern: see
    `app/dashboard/page.tsx` — static shell in the page, async child in Suspense.
  - To force request-time rendering without reading a request API, call
    `await connection()` (from `next/server`).
  - Caching is opt-in with the `"use cache"` directive + `cacheLife()` / `cacheTag()`.
    The old `fetch(..., { next: { revalidate } })` / `export const revalidate` model
    does not apply here.
  - `experimental.dynamicIO` / `experimental.useCache` are removed — it's `cacheComponents`.
- **Route handlers** (`app/**/route.ts`) run on Node.js by default — `pg` works there.
  Unimplemented HTTP methods get an automatic **405**.
- **`after(callback)`** (from `next/server`) runs work after the response is sent.
  Supported on a self-hosted Node server (our pm2 setup). Runs even if the handler errored.
- **Turbopack is the default** for `dev` and `build`.
- **`next lint` was removed.** Use `npm run lint` (ESLint flat config, `eslint.config.mjs`).
- `next/image`: local images with query strings, `images.domains` (deprecated →
  `remotePatterns`) and several defaults changed — read the image section of the
  upgrade guide before touching images.

## Repo patterns to follow

- Server-only modules (`lib/db.ts`, `lib/env.ts`, anything importing them) must never
  be imported from a `"use client"` file.
- Auth for `/dashboard` is checked twice: `proxy.ts` and again in the page
  (defence in depth — a matcher change or proxy bypass must not expose data).
  Keep both when adding protected routes.
- Path alias `@/` = repo root.

## Doc map (`node_modules/next/dist/docs/01-app/`)

| Topic | File |
|---|---|
| Everything that changed in 16 | `02-guides/upgrading/version-16.md` |
| Route handlers | `01-getting-started/15-route-handlers.md`, `03-api-reference/03-file-conventions/route.md` |
| Proxy | `01-getting-started/16-proxy.md`, `03-api-reference/03-file-conventions/proxy.md` |
| Caching / Suspense rules | `01-getting-started/08-caching.md`, `02-guides/migrating-to-cache-components.md` |
| `after`, `connection`, `headers`, `cookies` | `03-api-reference/04-functions/<name>.md` |
| Self-hosting (pm2/Nginx) | `02-guides/self-hosting.md`, `01-getting-started/17-deploying.md` |
| Auth patterns | `02-guides/authentication.md`, `02-guides/authentication-with-cache-components.md` |
| Env vars | `02-guides/environment-variables.md` |

Grep the docs folder for a symbol before using any API you're not sure about.
