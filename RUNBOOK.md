# RUNBOOK — lead-pipeline

Operational notes for the production VPS. Deploy, Nginx, SSL and pm2 sections are
added in roadmap step 7.

## Daily summary (cron)

`scripts/daily-summary.ts` counts leads from the last 24h and sends them, HMAC-signed,
to the n8n workflow **Daily summary** (`N8N_SUMMARY_WEBHOOK_URL`), which emails them.
It sends even when the count is 0, so a missing email means the cron (or n8n) is broken.

### Manual run

```bash
cd /srv/lead-pipeline              # app directory (adjust if different)
npm run summary -- --dry-run       # print the payload, send nothing
npm run summary                    # send for real
```

Exit code 0 = sent. Exit code 1 = failed; the reason is printed as `[summary] failed: …`.

### Install the cron job

Cron uses the server's timezone. Set it once, so "08:00" means Bucharest time
(including summer/winter time changes):

```bash
sudo timedatectl set-timezone Europe/Bucharest
sudo systemctl restart cron
sudo mkdir -p /var/log/lead-pipeline && sudo chown "$USER" /var/log/lead-pipeline
```

Then `crontab -e` (as the user that runs the app) and add:

```cron
# Daily lead summary at 08:00 server time
0 8 * * * cd /srv/lead-pipeline && PATH=/usr/local/bin:/usr/bin:/bin npm run summary >> /var/log/lead-pipeline/summary.log 2>&1
```

Cron runs with a minimal `PATH`. If Node was installed with nvm, replace `npm` with the
absolute path from `which npm`.

### Check it

```bash
crontab -l                                   # job is installed
tail -n 20 /var/log/lead-pipeline/summary.log  # one "[summary] … sent" line per day
grep CRON /var/log/syslog | tail             # cron actually started the job
```

No email this morning?
1. Log shows `sent` → the problem is in n8n: check the **Daily summary** workflow's
   Executions list, and that the workflow is still published.
2. Log shows `[summary] failed: n8n responded 401` → `WEBHOOK_SECRET` in `.env` doesn't
   match the n8n Crypto credential `lead-webhook-secret`.
3. Log shows `failed: n8n responded 404` → workflow unpublished or wrong URL.
4. Log empty → cron didn't run it: check `crontab -l`, `PATH`, and syslog.
