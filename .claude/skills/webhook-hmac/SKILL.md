---
name: webhook-hmac
description: Use when sending or verifying a signed webhook (new lead → n8n), editing lib/webhook.ts, or building the n8n verification step.
---

# Signed webhooks (app → n8n)

## Decided design

- Headers:
  - `X-Timestamp: <unix seconds>`
  - `X-Signature: sha256=<hex HMAC-SHA256(WEBHOOK_SECRET, timestamp + "." + rawBody)>`
- Including the timestamp in the signed string blocks **replay**: the receiver rejects
  requests older than 5 minutes, so a captured request can't be resent later.
- Env (zod in `lib/env.ts` + placeholders in `.env.example`):
  - `N8N_WEBHOOK_URL` — `z.url()`
  - `WEBHOOK_SECRET` — min 32 chars; generate with
    `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`

## Sender rules (`lib/webhook.ts`)

1. **Serialize once.** `const raw = JSON.stringify(payload)`; sign `raw`, send `raw` as
   the body. Never stringify twice — key order/whitespace could differ and the
   signature breaks.
2. Payload: only what n8n needs (id, name, email, company, source, created_at). No secrets.
3. `fetch(url, { method: "POST", body: raw, headers: {...}, signal: AbortSignal.timeout(5000) })`
   — a hung n8n must not hold resources forever.
4. Treat non-2xx as failure. **Log and swallow** — the form submit must still return 201.
   Log id + status/error message, not the full payload (it contains PII).
5. Call it after the insert succeeds. Prefer `after()` from `next/server` so the user's
   response isn't delayed by n8n (works on our self-hosted Node server).

```ts
import { createHmac } from "node:crypto";
const ts = Math.floor(Date.now() / 1000).toString();
const sig = createHmac("sha256", env.WEBHOOK_SECRET).update(`${ts}.${raw}`).digest("hex");
```

## Receiver (n8n Cloud, workflow "New lead")

Exported to `n8n/new-lead-workflow.json`. The live workflow runs in n8n Cloud; the
export is a copy for git (From/To emails replaced with `you@example.com`).

```
Webhook → Code "Signing input" → Crypto "HMAC" → Code "Verify" → IF valid
                                                    ├─ true  → Send Email (SMTP) → Respond 200
                                                    └─ false → Respond 401 {"error":"invalid signature"}
```

1. **Webhook**: POST, path `new-lead`, Respond = `Using 'Respond to Webhook' Node`,
   option **Raw Body** on. With Raw Body on, the exact request bytes land in the
   **binary property `data`**; `$json.body` is n8n's parsed copy and must NOT be signed.
   Headers arrive lowercase: `x-timestamp`, `x-signature`.
2. **Signing input** (Code): `await this.helpers.getBinaryDataBuffer(0, 'data')` →
   utf8 string → outputs `toSign = ts + "." + raw`, plus `ts` and `sig`.
3. **HMAC** (Crypto node, Hmac / SHA256 / HEX, value `{{ $json.toSign }}`, output `expected`).
   The secret is the **Crypto credential `lead-webhook-secret`** ("Hmac Secret" field).
   Why a credential: n8n Cloud has no `.env` for us, and custom variables (`$vars`) are
   paid-plan only. Credentials are stored encrypted and are NOT included in the export.
4. **Verify** (Code): `require('crypto')` works on n8n Cloud without config. Compare
   `sha256=<expected>` with the header via `crypto.timingSafeEqual` (lengths checked
   first — it throws on mismatch); reject if `|now - ts| > 300` s or ts isn't digits.
   Outputs `{ valid }`.
5. **IF** `{{ $json.valid }}` is true (Boolean). True → email, false → 401, no email.
6. **Send Email**: SMTP credential `lead-notify-smtp` — `smtp.gmail.com`, port 465, SSL on,
   User = full Gmail address, Password = 16-char Google **App Password** (no spaces).
   Email Format = fixed `Text` (not an expression), body in the Text field; fields read
   from `$('Webhook').item.json.body` — safe because the signature already passed.
   n8n attribution turned off.

Before committing a new export: check it doesn't contain the secret value, credentials
appear only as `{ id, name }` references, and `pinData` is empty.

Test URL `/webhook-test/new-lead` works for one call after "Execute workflow";
production URL `/webhook/new-lead` only while the workflow is published.

## Verify

- Valid signed request → 200, email arrives.
- Tamper one byte of the body → 401.
- Old timestamp (e.g. now − 600) → 401.
- No signature headers → 401.
- Wrong URL / n8n down → form still returns 201, server log shows
  `[webhook] lead N: n8n responded 404` (or the fetch error).
