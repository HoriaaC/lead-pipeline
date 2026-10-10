# BUILD_LOG — working with Claude Code

A short honest record of building this project with an AI agent:
what I asked, what it got wrong, how I noticed, how I fixed it.
These are real notes, written as I went.

---

## Template

### [date] Step N — short title
- **What I asked:**
- **What it proposed / produced:**
- **What was wrong (or risky):**
- **How I noticed:** (review, test, error log, reading the docs…)
- **How I fixed it:**
- **Lesson:**

---

## Entries

<!-- newest at the bottom -->

### 2026-10-10 Step 1 — Scaffold + database completed
- **What I asked:** Run db checks, then propose 4 commits.
- **What it produced:** All step 1 code was written; user added `.env` and Supabase CA cert. Ran `db:check`, `db:migrate` (twice), `db:seed` — all passed.
- **What was wrong:** Nothing. Code was correct, all checks passed.
- **How I noticed:** `npm run db:check` connected to PostgreSQL 17.11; `db:migrate` applied migration on first run, returned "No pending migrations" on second (idempotent); `db:seed` inserted 6 leads.
- **How I fixed it:** N/A. Just verified and committed.
- **Lesson:** A thin, well-tested first step (env validation, connection pooling, migrations, seed data) is the foundation. Type-checking and linting caught no issues. Step 2 (lead form + API) is next.
