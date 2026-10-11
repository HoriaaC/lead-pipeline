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

### 2026-10-11 Step 4 — "webhook down" test passed, but tested the wrong server
- **What I asked:** prove that a failing webhook doesn't break the form (n8n unreachable → form still returns 201).
- **What it produced:** stopped the dev server, restarted it with a broken `N8N_WEBHOOK_URL`, submitted a lead, got 201 — "test passed".
- **What was wrong (or risky):** stopping the background task only killed `npm`; the old `next dev` kept running on port 3000. The new server fell back to port 3001 and then exited, so the request hit the *old* server with the *correct* URL. A green result for the wrong reason — and an unwanted extra email.
- **How I noticed:** the agent checked the second server's log, saw "Another next dev server is already running", and flagged the result as invalid instead of reporting success.
- **How I fixed it:** killed the leftover process by PID, confirmed port 3000 was free, re-ran the test: 201 + `[webhook] lead 14: n8n responded 404` in the log.
- **Lesson:** a passing test only counts if you can show it ran against the setup you think it did. Check the evidence (logs, ports), not just the status code.

### 2026-10-11 Step 4 — HTTP 200 reported as success, email body was "undefined"
- **What I asked:** get the n8n workflow sending the new-lead email.
- **What it produced:** after fixing SMTP, the test request returned 200 and the agent reported the flow as working end to end.
- **What was wrong (or risky):** the email arrived with body `undefined`. The text had been entered into the *Email Format* field (as an expression) instead of the *Text* field, so n8n had no body to send. 200 only proved the workflow ran, not that the output was right.
- **How I noticed:** I looked at the actual emails in Gmail and sent a screenshot.
- **How I fixed it:** set Email Format back to a fixed `Text` value, put the template in the Text field, re-tested and checked the received email content.
- **Lesson:** verify the final output a human sees (the email), not just the HTTP status. "No error" ≠ "correct".

### 2026-10-11 CI — type-check passed locally, failed on GitHub
- **What I asked:** add GitHub Actions CI (lint, type-check, tests, build).
- **What it produced:** a workflow running `npx tsc --noEmit`; it had passed locally, so the agent pushed it.
- **What was wrong (or risky):** the first CI run failed with `Cannot find name 'LayoutProps'`. That type comes from files Next generates (`next-env.d.ts`, `.next/types`), which are gitignored. Locally they existed because `next dev` had created them; a fresh CI checkout has none.
- **How I noticed:** the agent checked the CI result after pushing instead of assuming green, and read the failing step's annotations.
- **How I fixed it:** reproduced it locally by removing the generated files (same error), then added `npm run typecheck` = `next typegen && tsc --noEmit` (the approach the Next 16 docs recommend for CI). Second run green.
- **Lesson:** "works on my machine" includes ignored and generated files. A clean CI checkout is the real test.
