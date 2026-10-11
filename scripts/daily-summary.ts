// Daily lead summary, run by cron: `npm run summary` (add `-- --dry-run` to only print).
// Counts leads from the last 24h and sends them, signed, to the n8n summary workflow,
// which emails them. Sent even when the count is 0: a daily email proves the cron is alive.
import { pool } from "@/lib/db";
import { env } from "@/lib/env";
import { leadSummarySince } from "@/lib/leads";
import { postSigned } from "@/lib/webhook";

const HOURS = 24;

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const periodEnd = new Date();
  const periodStart = new Date(periodEnd.getTime() - HOURS * 60 * 60 * 1000);

  const { bySource, latest } = await leadSummarySince(HOURS);
  const payload = {
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    total: bySource.reduce((sum, s) => sum + s.count, 0),
    by_source: bySource,
    latest: latest.map((l) => ({ ...l, created_at: l.created_at.toISOString() })),
  };

  if (dryRun) {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  // Longer timeout than the form webhook: nobody is waiting on this request.
  await postSigned(env.N8N_SUMMARY_WEBHOOK_URL, payload, 15000);
  console.log(`[summary] ${periodEnd.toISOString()}: sent, ${payload.total} leads in last ${HOURS}h`);
}

main()
  .catch((err) => {
    // Non-zero exit so the failure is visible in the cron log, not silently ignored.
    console.error(`[summary] failed: ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
