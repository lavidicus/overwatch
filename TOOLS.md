# TOOLS.md - Local Notes

## 🐦 X (Twitter) Tool

**Purpose:** Browse X.com using your login credentials via browser automation

**Credentials:**
- **Username:** @Bjoyrn_
- **Email:** bjoyrn@grr.la
- **Stored in:** `~/.openclaw/workspace/credentials/x.json`

**How to use:**
1. **From command line:**
   ```bash
   # Search X
   ~/openclaw/workspace/scripts/x-tool.sh search "OpenClaw news"
   
   # View profile
   ~/openclaw/workspace/scripts/x-tool.sh profile @openclaw
   
   # Home timeline
   ~/openclaw/workspace/scripts/x-tool.sh home
   
   # Notifications
   ~/openclaw/workspace/scripts/x-tool.sh notifications
   ```

2. **From chat (easiest):**
   - "Browse X for OpenClaw news"
   - "Check X for @openclaw profile"
   - "Show X home timeline"

**Browser requirements:**
- Chrome/Chromium/Brave/Firefox running on host
- Or falls back to web_fetch if no browser available

---

## 🔧 N8n Workflow Automation (CRITICAL — READ BEFORE ANY N8N CALL)

**Server:** `http://ocg.9xc.local:5678` (NEVER `localhost`)
**Owner:** Jeremy Ingalls (`jeremy.ingalls@gmail.com`)
**Service:** `systemctl status n8n`
**API Key:** stored in `openclaw.json` → `skills.entries.n8n-mcp.config.apiKey`

**API Rules:**
- Endpoint: `/api/v1/` (NOT `/rest/`)
- Auth header: `X-N8N-API-KEY: <key>` (NOT `Authorization: Bearer`)
- Activate: `POST /api/v1/workflows/{id}/activate` (NOT via PUT body)
- `active` field is **READ-ONLY** in PUT requests
- Wait 5+ seconds after activation before testing webhooks

**⚠️ CRITICAL (learned the hard way):**
- **`webhookId` is REQUIRED** on webhook nodes — without it webhooks never register
- **Code nodes are SANDBOXED** — `child_process`, `fs`, `net` are all blocked
- **Use gog-bridge service** (port 18790) to run CLI tools from workflows
- **Use `127.0.0.1` not `localhost`** in HTTP Request nodes (IPv6 mismatch)
- **Restart n8n after creating workflows via API** — `sudo systemctl restart n8n && sleep 12`
- **Write JSON to file, use `curl -d @file`** — avoids shell escaping nightmares
- **Only ONE workflow per webhook path** — duplicates cause silent failures

**Quick Reference:**
```bash
# List workflows
curl -s "http://ocg.9xc.local:5678/api/v1/workflows" -H "X-N8N-API-KEY: $KEY"

# Create workflow (from file — always use file to avoid escaping)
curl -s -X POST "http://ocg.9xc.local:5678/api/v1/workflows" -H "X-N8N-API-KEY: $KEY" -H "Content-Type: application/json" -d @workflow.json

# Activate
curl -s -X POST "http://ocg.9xc.local:5678/api/v1/workflows/{id}/activate" -H "X-N8N-API-KEY: $KEY"

# Trigger webhook
curl -s -X POST "http://ocg.9xc.local:5678/webhook/{path}" -H "Content-Type: application/json" -d '{}'
```

**Gog Bridge (for CLI tools in workflows):**
- Service: `gog-bridge.service` on port 18790
- URL in workflows: `http://127.0.0.1:18790/fetch-emails`
- Management: `sudo systemctl {start|stop|restart} gog-bridge`

**Full playbook:** `ITIL/playbooks/openclaw-n8n-integration.md`
**PKB reference:** `pkb/resources/n8n-workflow-automation.md`
**Integration script:** `scripts/sam-n8n-integration.sh`

---

## 🚨 File Edit Tool Constraint (CRITICAL)

**Problem:** The `edit` tool fails silently with "Invalid diff" errors when text doesn't match exactly (whitespace, line endings, etc.)

**Solution:**
1. **Read file first** with `read` to get exact content
2. **Use that exact content** in `oldText` parameter
3. **Fallback:** If `edit` fails, use `write` which overwrites without exact matching
4. **Default strategy:** Use `write` for complete file overwrites; use `edit` only for small, precise changes

---

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## 🔧 SSH Hosts & Infrastructure

### Proxmox ESXi Server
- **Hostname:** `ts.9xc.local` (formerly USM1/USM2)
- **IP:** `172.16.254.5`
- **Access:** `ssh root@ts.9xc.local`
- **Hardware:** Supermicro SYS-6028R-T-2-TR013
- **CPU:** 2× Xeon E5-2680 v4 (56 cores / 112 threads)
- **RAM:** 251 GB
- **Storage:** 17.3 TiB SAS pool + 2.7 TiB FAST pool
- **VMs:** node1 (VM 100) — GPU machine with 2× P6000

### Decommissioned
- **USM1:** Physically removed (drives wiped)
- **USM2:** Physically removed (drives wiped)

### Other SSH Aliases

- `home-server` → 192.168.1.100, user: admin

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your infrastructure.

---

Add whatever helps you do your job. This is your cheat sheet.

<!-- antfarm:workflows -->
# Antfarm Workflows

Antfarm CLI (always use full path to avoid PATH issues):
`node ~/.openclaw/workspace/antfarm/dist/cli/cli.js`

Commands:
- Install: `node ~/.openclaw/workspace/antfarm/dist/cli/cli.js workflow install <name>`
- Run: `node ~/.openclaw/workspace/antfarm/dist/cli/cli.js workflow run <workflow-id> "<task>"`
- Status: `node ~/.openclaw/workspace/antfarm/dist/cli/cli.js workflow status "<task title>"`
- Logs: `node ~/.openclaw/workspace/antfarm/dist/cli/cli.js logs`

Workflows are self-advancing via per-agent cron jobs. No manual orchestration needed.
<!-- /antfarm:workflows -->
