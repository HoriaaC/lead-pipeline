---
name: api-route
description: Use when creating or changing an HTTP route handler under app/api/ (request parsing, validation, status codes, error handling).
---

# API route handlers

Reference implementation: `app/api/leads/route.ts`. New routes follow the same shape.
Also load `nextjs16-conventions` for framework details.

## Layering

- **Route file stays thin:** parse → validate → call lib → map to status code.
- **zod schemas and SQL live in `lib/<thing>.ts`** (see `lib/leads.ts`), exported as
  `xInput` schema + typed functions. The route never contains SQL.
- SQL is parameterized only (`$1, $2…`). `pg` returns `bigint` as a **string** — keep
  ids as strings end to end.

## Skeleton

```ts
import { z } from "zod";
import { doThing, thingInput } from "@/lib/thing";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = thingInput.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Validation failed", fields: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }

  try {
    const result = await doThing(parsed.data);
    return Response.json(result, { status: 201 });
  } catch (err) {
    // Full detail stays in server logs; the client never sees SQL or stack traces.
    console.error("[api/thing] failed:", err);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}
```

## Status codes

| Case | Code |
|---|---|
| Created | 201 (body: `{ id }`) |
| Read OK | 200 |
| Malformed JSON / failed validation | 400 (with `fields` for validation) |
| Not authenticated | 401 + `WWW-Authenticate` if Basic Auth |
| Unknown resource | 404 |
| Method not exported | 405 (Next does this automatically) |
| Anything unexpected | 500, generic message, `console.error` with a `[route]` prefix |

## Side effects that must not fail the request

E.g. the step 4 webhook to n8n: run it **after** the DB insert succeeded, in its own
`try/catch`, log failures, never change the response status because of it. Consider
`after()` from `next/server` so the user doesn't wait on n8n (see `webhook-hmac`).

## Env vars

A new env var goes into `lib/env.ts` (zod) **and** `.env.example` (placeholder + one-line
comment on where to get it) in the same change.

## Verify (dev server running)

```bash
curl -i -X POST localhost:3000/api/thing -H 'content-type: application/json' -d '{...valid...}'   # 201
curl -i -X POST localhost:3000/api/thing -H 'content-type: application/json' -d '{bad'           # 400
curl -i -X POST localhost:3000/api/thing -H 'content-type: application/json' -d '{}'             # 400 + fields
curl -i -X DELETE localhost:3000/api/thing                                                       # 405
```
Plus `npm run lint` and `npx tsc --noEmit`.
