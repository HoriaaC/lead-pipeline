---
name: vps-ops
description: Use for anything on the production VPS — deploy, pm2, Nginx, SSL/certbot, crontab, server logs, firewall, or "the site is down" troubleshooting.
---

# VPS operations (Ubuntu 24.04, Nginx, certbot, pm2)

## Hard rules

- **Never assume server state.** You cannot see the server. Give the user exact
  commands to run, ask for the output, then decide.
- **Nothing destructive without explicit approval** (deleting files, `pm2 delete`,
  dropping data, changing firewall rules, editing Nginx sites).
- Secrets live only in `.env` on the server (`chmod 600`), never in the repo, never in
  `ecosystem.config.js`, never pasted into chat output you write to files.
- Whatever we learn here goes into `RUNBOOK.md` in the same session — keep them in sync.

## Deploy (update an existing install)

```bash
cd /path/to/lead-pipeline
git pull --ff-only
npm ci
npm run db:migrate
npm run build
pm2 reload ecosystem.config.js   # zero-downtime restart
pm2 status && curl -I https://<domain>/
```
If `build` fails, the old version keeps running — don't reload.

## pm2

- Config: `deploy/ecosystem.config.js` (app runs `npm start` → Next on `127.0.0.1:3000`).
- `pm2 logs <app> --lines 100`, `pm2 status`, `pm2 reload <app>`.
- Survive reboots: `pm2 startup` (prints a command to run with sudo) then `pm2 save`.

## Nginx

- **Always `sudo nginx -t` before `sudo systemctl reload nginx`.** A broken config +
  reload = site down.
- Proxy to `http://127.0.0.1:3000`; pass `Host`, `X-Forwarded-For`, `X-Forwarded-Proto`.
  The `Authorization` header is forwarded by default — don't strip it (dashboard Basic Auth).
- Next must listen on localhost only; port 3000 must not be open in the firewall
  (`sudo ufw status` → only 22, 80, 443).
- Logs: `/var/log/nginx/error.log`, `/var/log/nginx/access.log`.

## SSL (certbot)

- Issue: `sudo certbot --nginx -d <domain>`.
- Check auto-renewal: `systemctl list-timers | grep certbot` and
  `sudo certbot renew --dry-run`.

## Cron (daily summary)

```
0 8 * * * cd /path/to/lead-pipeline && /usr/bin/npx tsx --env-file=.env scripts/daily-summary.ts >> /var/log/lead-pipeline/daily-summary.log 2>&1
```
- Cron has a minimal `PATH` — use absolute paths (`which npx` to find it; nvm installs
  live under `~/.nvm`, so confirm with the user how Node was installed).
- Server timezone matters: `timedatectl` — confirm whether `0 8` is UTC.
- Test the exact command by hand before installing the line with `crontab -e`.

## "Site is down" triage (in this order)

1. **DNS:** `dig +short <domain>` → VPS IP?
2. **From outside:** `curl -I https://<domain>/` → status code / TLS error?
3. **Nginx:** `sudo systemctl status nginx`, `sudo nginx -t`, tail error.log
   (502 = Nginx is fine, app is not).
4. **App:** `pm2 status`, `pm2 logs <app> --lines 100`, `curl -I http://127.0.0.1:3000/`.
5. **Database:** `npm run db:check` on the server (Supabase paused? credentials?).
6. **Resources:** `df -h`, `free -m`, `uptime`.
7. **Cert:** `sudo certbot certificates` → expiry date.
