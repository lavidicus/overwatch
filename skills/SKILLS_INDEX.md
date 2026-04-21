# Skills Index

This directory contains OpenClaw skills. Each skill is a subdirectory with:

- `SKILL.md` — Documentation on what the skill does and how to use it
- `scripts/` — Executable scripts for the skill (optional)
- `references/` — Supporting notes and lessons learned (optional)

## Available Skills

### browser-automation
Automate web browser interactions using natural language via CLI commands.

### cognee
Cognee RAG integration for long-term memory and knowledge graphs.

### comfyui
Generate images and videos via a self-hosted ComfyUI instance.

### config-editor
Edit OpenClaw configuration files safely.

### cost-report
Generate cost reports for cloud spending and resource usage.

### daily-systems-status
**Generate a daily systems status report for TS (Proxmox host) and NODE1 (llama.cpp VM), render it as a PDF, and email it via `gog`.**

**Usage:**
```bash
skills/daily-systems-status/scripts/daily-systems-status.sh
```

**What it does:**
- Collects TS temperatures via `ipmitool` (CPU1/CPU2/System/PCH/Peripheral)
- Reports ZFS pool status (SAS, fast-store, rpool)
- Reports NODE1 llama.cpp service status, GPU temps, RAM, root FS
- Generates a PDF report and emails it to `jeremy.ingalls@gmail.com`
- Falls back to plain text if PDF generation fails

**Prerequisites:** `gog` CLI configured, `pandoc` + `xelatex` installed

**Daily schedule:** To run automatically at 06:30 AM CST (12:30 UTC), add to crontab:
```cron
30 12 * * * /home/localadmin/.openclaw/workspace/skills/daily-systems-status/scripts/daily-systems-status.sh >/tmp/daily-systems-status-cron.log 2>&1
```

### domain-checker
Check domain registration and DNS status.

### execution-logs
Skill execution logging and performance tracking.

### git-notes-memory
Git-based notes and memory management.

### gog
Google Workspace CLI (Gmail, Calendar, Drive, Contacts, Sheets, Docs).

---

*Index generated: 2026-04-13*
