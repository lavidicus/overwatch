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

**Server:** `http://localhost:5678` (moved from ocg.9xc.local to claw)
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
curl -s "http://localhost:5678/api/v1/workflows" -H "X-N8N-API-KEY: $KEY"

# Create workflow (from file — always use file to avoid escaping)
curl -s -X POST "http://localhost:5678/api/v1/workflows" -H "X-N8N-API-KEY: $KEY" -H "Content-Type: application/json" -d @workflow.json

# Activate
curl -s -X POST "http://localhost:5678/api/v1/workflows/{id}/activate" -H "X-N8N-API-KEY: $KEY"

# Trigger webhook
curl -s -X POST "http://localhost:5678/webhook/{path}" -H "Content-Type: application/json" -d '{}'
```

**Gog Bridge (for CLI tools in workflows):**
- Service: `gog-bridge.service` on port 18790
- Source: `~/.openclaw/workspace/services/gog-bridge/server.js`
- Management: `sudo systemctl {start|stop|restart|status} gog-bridge`
- Auth: `GOG_KEYRING_PASSWORD=openclaw` (set in systemd unit)
- Account: `ops@claw-sync.com`

**Endpoints (POST with JSON body, GET for health/auth):**
```
GET  /health              — Health check
GET  /auth                — Authenticated accounts
POST /gmail/search        — Search threads (body: {query, max, account?})
POST /gmail/messages      — List unthreaded messages (body: {query, max, account?})
POST /gmail/send          — Send email (body: {to, subject, body|bodyFile|bodyHtml, account?, replyToMessageId?, draft?})
POST /calendar/events     — List events (body: {calendarId?, from, to, account?})
POST /calendar/create     — Create event (body: {calendarId?, summary, from, to, account?, eventColor?})
POST /drive/search        — Search Drive (body: {query, max, account?})
POST /contacts/list       — List contacts (body: {max, account?})
POST /sheets/get          — Read range (body: {sheetId, range, account?})
POST /sheets/append       — Append (body: {sheetId, range, valuesJson, account?})
POST /sheets/update       — Update (body: {sheetId, range, valuesJson, account?})
POST /sheets/metadata     — Sheet metadata (body: {sheetId, account?})
```

**n8n workflow usage:**
- Use HTTP Request node with `127.0.0.1:18790` (not localhost — IPv6)
- Method: POST, Content-Type: application/json
- Body: JSON matching endpoint schema above
- Example: fetch recent emails → `POST http://127.0.0.1:18790/gmail/search` with `{"query":"newer_than:1d","max":10}`

**Full playbook:** `ITIL/playbooks/openclaw-n8n-integration.md`
**PKB reference:** `pkb/resources/n8n-workflow-automation.md`
**Integration script:** `scripts/sam-n8n-integration.sh`

---

## 🔧 OpenClaw Service Check (CRITICAL)

**Service name:** `openclaw-gateway` (user-level systemd service)
**Correct command:** `systemctl --user is-active openclaw-gateway`
**NOT** `systemctl is-active openclaw` — that checks the system-level service which doesn't exist
**Also NOT** `systemctl --user is-active openclaw` — wrong service name, use `openclaw-gateway`

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
  - **Node1 IP:** 172.16.254.100
  - **Node2 IP:** 172.16.254.101
  - **Model:** Qwen3.6-35B Q4_K_M (`llamacpp.gguf`)
  - **Optimized config (2026-05-15):** `--poll 2048 --poll-batch 1 --ctx-size 32768 --tensor-split 0.5,0.5 --threads 32 --threads-batch 32 --mlock --numa numactl --flash-attn on`
  - **Benchmarks (post-opt):** ~53 tok/s generation, ~200 tok/s prompt | Both P6000s at ~23GB/24GB | Service on port 11434
  - **Streaming:** SSE supported, OpenClaw `supportsUsageInStreaming: true`
  - **Note:** Optimization knobs (`--poll`, `--ctx-size`) don't change raw decode throughput — model is GPU-bound.

### USM1 (new hardware, May 2026)
- **Hostname:** `usm1` (replaced old USM1 — completely different machine)
- **Access:** `ssh root@usm1`
- **Hardware:** Supermicro (board date Jan 2020)
- **CPU:** 1× Xeon E5-2620 v4 (8 cores / 16 threads, 2.10GHz)
- **RAM:** 62 GB
- **Storage:** 355 GB ZFS (rpool)
- **OS:** Proxmox (Debian Trixie 13.4), kernel 6.17.2-1-pve
- **GPU:** None
- **Notes:** Single-socket, much less powerful than old USM1. Chassis intrusion log from May 12 (hardware swap). No additional storage pools detected.



### Other SSH Aliases

- `pve3090-111` → user1@pve3090-111, 2x RTX 3090 (48GB each), 62GB RAM, Ubuntu — llama.cpp host (port 11434), main session only (slot contention)
- `hermes` → 10.50.15.231, user: localadmin, purpose: NousResearch Hermes 3 agent (CPU-only, 16 cores, 15GB RAM)

## 🧠 LLM Inference

### Active Providers
| Provider | Host | GPU | Model | tok/s | Port |
|---|---|---|---|---|---|
| **node1** | 172.16.254.100 | 2× P6000 (48GB) | Qwen3.6-35B Q4_K_M | ~52 gen / ~200 prompt | 11434 |
| **node2** | 172.16.254.101 | 1× P6000 (24GB) | Qwen3.6-35B Q4_K_M | ~52 gen / ~200 prompt | 11434 |
| **pve3090-111** | pve3090-111 | 2× RTX 3090 (48GB) | Qwen3.6-35B-A3B Q8_K_XL | ~102 gen (clean) | 11434 |

### Model Routing
- **Main session:** pve3090-111/llamacpp (VM111)
- **Sub-agents:** node1/llamacpp OR node2/llamacpp, alternating 50/50 to balance load
- VM111 reserved for main session only — slot contention makes it unsuitable for sub-agents

### Tuning Notes
- `--poll 2048` — main speed knob for GPU inference (was default 50)
- `--ctx-size 32768` — reduced from 262144 (huge context wastes VRAM on KV cache)
- `--tensor-split 0.5,0.5` — explicit split across both GPUs
- `--mlock` — keep model in RAM, prevent swap
- `--numa numactl` — dual-socket CPU optimization
- Raw decode speed is model+GPU bound; tuning improves consistency/latency, not throughput
- For faster decode: consider running a smaller MoE model on P6000s or using pve3090-111 for interactive use

## 🧠 Sub-Agent Model Rule

**All sub-agents alternate between node1 and node2, 50/50 split to balance load.**
- Use `model="node1/llamacpp` for even-numbered sub-agents in a session
- Use `model="node2/llamacpp` for odd-numbered sub-agents in a session
- Track last-used in memory if needed to maintain balance
- VM111 (pve3090-111) is reserved for main session only — slot contention kills sub-agent throughput

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
