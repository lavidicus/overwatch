---
name: daily-systems-status
version: 2.0.0
author: Sam (Jeremy Ingalls's ops-butler AI)
description: Generate a daily systems status report for TS (Proxmox host) and NODE2 (llama.cpp VM with 2x P6000), render as styled HTML dashboard, and email via gog.
keywords:
  - systems
  - monitoring
  - health-report
  - ts-proxmox
  - node2
  - llama
  - html-dashboard
  - daily-report
---

# daily-systems-status

Generates a **styled HTML dashboard** for your homelab, covering:

- **TS Proxmox host** — ZFS pools, disk health, temps, fans, voltages
- **NODE2 VM** (Ubuntu 24.04) — llama.cpp service, 2x Quadro P6000, RAM, root FS
- **Cost tracking** — GPU power draw, daily kWh, estimated cost
- **Summary + action items** — failing disks, fan alerts, next steps

## How It Works

1. Collects metrics via SSH from:
   - `root@ts.9xc.local` (ipmitool sensors)
   - `localadmin@node2` (free, df, systemctl, nvidia-smi)
2. Generates a styled HTML dashboard at `/tmp/daily-systems-dashboard-YYYYMMDD.html`
3. Emails it as an attachment to `jeremy.ingalls@gmail.com` via `gog gmail send`

## Files

- `scripts/daily-systems-status.sh` — Main script (collects, renders HTML, emails)

## How to Run

```bash
bash ~/.openclaw/workspace/skills/daily-systems-status/scripts/daily-systems-status.sh
```

## Prereqs

- `gog` configured for Gmail
- SSH access to `root@ts.9xc.local` and `localadmin@node2`
- `ipmitool` on TS host
- `nvidia-smi` on Node2

## Cron

Runs daily at 12:30 UTC (06:30 CST) via OpenClaw cron job `daily-systems-status-report`.
