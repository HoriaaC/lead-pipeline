---
name: db-migration
description: Use when adding or changing a database table, column, index, constraint, or Postgres role/grant — anything that changes the schema.
---

# Database migrations

Runner: `db/migrate.ts` (`npm run db:migrate`). It applies `db/migrations/*.sql` in
filename order, each file in its own transaction, and records it in `schema_migrations`.

## Rules

1. **Never edit a migration that has been applied** (locally or in prod). Fix mistakes
   with a new file. Migrations are forward-only; there are no down files.
2. **One logical change per file.** Name: next number + verb + noun, e.g.
   `002_add_leads_status_index.sql`, `003_create_readonly_role.sql`.
3. **No `begin`/`commit` in the file** — the runner already wraps it in a transaction.
4. **`create index concurrently` cannot run inside a transaction**, so it fails here.
   The table is small; use a plain `create index`. If that ever matters, raise it —
   don't hack the runner.
5. Lowercase SQL, explicit names for constraints and indexes
   (`leads_created_at_idx`), `if not exists` only where it's genuinely idempotent.
6. **Ask before running a migration against the real (Supabase) database.**
   Never guess current DB state — give the user a query to run instead.

## After a schema change, also update

- `lib/leads.ts` — the `Lead` type, `leadInput` zod schema, and any `select` column lists
- `db/seed.ts` — if new not-null columns need values
- `CLAUDE.md` data model section, if the `leads` table changed

## Verify

```bash
npm run db:migrate   # prints "applied  00N_..."
npm run db:migrate   # second run must print "No pending migrations."
npx tsc --noEmit
```
Then a `select` that proves the change (e.g. `\d leads` in psql, or a query on
`information_schema.columns` / `pg_indexes`).

## Read-only role (step 6, MCP server)

```sql
-- 00N_create_readonly_role.sql
-- The MCP server connects as this role so it physically cannot write,
-- regardless of what the agent asks for.
create role leads_reader login;
grant usage on schema public to leads_reader;
grant select on leads to leads_reader;
```
- Set the password **outside** the migration (it's a secret, migrations are committed):
  the user runs `alter role leads_reader password '...'` once, by hand, and puts the
  connection string in `.env` (e.g. `MCP_DATABASE_URL`) + a placeholder in `.env.example`.
- On Supabase the pooler username format is `role.PROJECT_REF` — confirm with the user.
- Verify: connecting as `leads_reader`, an `insert` must fail with "permission denied".
