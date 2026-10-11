# CLAUDE.md — lead-pipeline

Instructions for Claude Code. Read this at the start of every session.

## What this project is

A small, end-to-end lead-generation pipeline, built as a learning exercise:

landing form → `POST /api/leads` → Postgres → signed webhook → n8n → email notification
+ a daily cron summary, a protected dashboard, and a read-only MCP server so an agent can query leads.

The goal is a **thin, complete, live slice** that the author understands line by line.
Prefer less scope done well over more scope done shallowly.

## Stack (fixed — do not change without asking)

- **Next.js (App Router) + TypeScript**, `strict: true`
- **PostgreSQL** (Supabase-hosted), accessed with **`pg` (node-postgres)** and **plain SQL**
  - No ORM. No query builder. Parameterized queries only (`$1, $2…`), never string interpolation.
- **zod** for input validation at every boundary (HTTP body, env vars, webhook payloads)
- **n8n Cloud** for automation (workflow exported as JSON into `n8n/`)
- **Node script + cron** for the daily summary
- **MCP server** (TypeScript, official `@modelcontextprotocol/sdk`), **read-only**
- **Deploy:** Ubuntu 24.04 VPS, Nginx reverse proxy, Let's Encrypt (certbot), process manager = **pm2** (one choice, not Docker too)

## Directory layout (target)

```
app/                    Next.js routes (page.tsx, api/leads/route.ts, dashboard/)
lib/                    db.ts (pg Pool), env.ts (zod-validated env), webhook.ts (HMAC signing)
db/migrations/          001_create_leads.sql, 002_..., applied in filename order
db/migrate.ts           tiny migration runner (tracks applied files in schema_migrations)
db/seed.ts              inserts a few fake leads for local dev
scripts/daily-summary.ts  run by cron
mcp/                    MCP server (list_leads, lead_stats)
n8n/                    exported workflow JSON
deploy/                 nginx.conf example, ecosystem.config.js (pm2)
README.md  RUNBOOK.md  BUILD_LOG.md
```

## Roadmap — do ONE step at a time

1. **Scaffold + database:** Next.js app, `lib/env.ts`, `lib/db.ts`, migration runner, `001_create_leads.sql`, seed script.
2. **Lead form + API:** landing page form, `POST /api/leads` with zod validation, correct status codes (201 / 400 / 500).
3. **Dashboard:** `/dashboard` listing latest leads, protected by HTTP Basic Auth (`proxy.ts` — Next 16's rename of middleware) + a re-check in the page.
4. **Webhook → n8n:** after insert, POST to n8n with `X-Signature` = HMAC-SHA256 of the raw body. n8n verifies it, sends an email. Webhook failure must NOT fail the user's form submit (log it). n8n runs on **n8n Cloud**; secret in an n8n Crypto credential (see `webhook-hmac` skill).
5. **Cron:** `scripts/daily-summary.ts` — counts leads from the last 24h, sends a summary. Crontab line documented in RUNBOOK.
6. **MCP server:** tools `list_leads(limit, since?)` and `lead_stats(period)`. Read-only DB role. No write tools.
7. **Deploy:** VPS, Nginx, SSL, pm2, `.env` on server. Write RUNBOOK.md as we go. *(Postponed: demoed locally for now.)*
8. **Docs polish:** README (setup, architecture, decisions), RUNBOOK (deploy, "site is down" checklist).

## Data model (step 1)

`leads`:
- `id` bigint identity primary key
- `name` text not null
- `email` text not null
- `phone` text null
- `company` text null
- `message` text null
- `source` text not null default 'website'   (e.g. utm_source)
- `status` text not null default 'new' with check in ('new','contacted','qualified','lost')
- `created_at` timestamptz not null default now()

Indexes: `created_at desc` (dashboard, stats), `email` (dedup lookups).

## How to work with me (rules for Claude Code)

- **Plan first.** For every step, propose: commands you'll run, files you'll create/change, and key code. Wait for approval before editing.
- **Small commits** with conventional messages (`feat:`, `fix:`, `chore:`, `docs:`). One logical change per commit. Ask before committing.
- **Never commit secrets.** All secrets in `.env` (gitignored). Keep `.env.example` up to date with placeholder values.
- **Ask before adding any dependency** not listed in the stack above, and say why it's needed.
- **Explain non-obvious choices** in a short code comment (the *why*, not the *what*).
- **Validate env at startup** via `lib/env.ts`; crash early with a clear message if something is missing.
- **Errors:** never leak stack traces or SQL errors to HTTP clients; log them server-side.
- **Don't guess** about the server or database state — ask, or give me a command to run and check.
- When I correct you, suggest a one-line entry for `BUILD_LOG.md`.

## Next.js version

This is **Next.js 16** — newer than most training data. Read @AGENTS.md and the docs in
`node_modules/next/dist/docs/` before writing Next-specific code.

## Commands

- `npm run dev` — local dev server
- `npm run db:check` — connection smoke test (user, server time, Postgres version)
- `npm run db:migrate` — apply pending migrations (safe to re-run)
- `npm run db:seed` — reset demo leads (all `@example.com`; re-runnable)
- `npm run lint` / `npx tsc --noEmit` — lint and type-check
- `npm test` — unit tests (`node:test` via tsx, dummy env from `test/test.env`)
- `npm run build && npm start` — production build

Scripts in `db/` and `scripts/` run with **tsx** and load `.env` via `--env-file`.
Supabase CA cert lives in `certs/supabase-ca.crt` (public, committed); `lib/db.ts` verifies SSL against it.
