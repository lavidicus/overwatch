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
**NOT** `systemctl is-active openclaw` — system-level service doesn't exist
**Also NOT** `systemctl --user is-active openclaw` — wrong name, must be `openclaw-gateway`

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
- **Note:** node1/node2 VMs powered off — P6000s moved to vLLM container on gateway (claw). Decommissioned for LLM work.

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
- `vllm` → Docker container on gateway (`claw`), http://vllm:11434, 2× P6000 backend, Qwen3.6-35B (vLLM runtime)

## 🧠 LLM Inference

### Active Providers
| Provider | Host | GPU | Model | tok/s | Port |
|---|---|---|---|---|---|
| **vllm** (gateway) | claw:11434 | 2× P6000 (48GB) | Qwen3.6-35B Q4_K_M | ~53 gen / ~200 prompt | 11434 |
| **pve3090-111** | pve3090-111 | 2× RTX 3090 (48GB) | Qwen3.6-35B-A3B Q8_K_XL | ~102 gen (clean) | 11434 |

### Decommissioned
- **node1/node2** — powered off since 2026-06-01, P6000s moved to vLLM container on gateway

### Model Routing
- **Main session:** pve3090-111/llamacpp (VM111) for interactive use
- **Sub-agents:** vllm/llamacpp (vLLM container on gateway) — single reliable endpoint
- VM111 reserved for main session only — slot contention kills sub-agent throughput

### Tuning Notes
- vLLM handles batching, KV cache, and GPU scheduling automatically — no manual tuning needed
- pve3090-111 uses llama.cpp with: `--poll 2048 --ctx-size 32768 --tensor-split 0.5,0.5 --threads 32 --mlock --numa numactl --flash-attn on`
- Raw decode speed is model+GPU bound; tuning improves consistency/latency, not throughput

## 📊 BenchLoop — LLM Benchmarking

**Install:** `pipx install benchloop-cli` (already installed)
**Commands:** `benchloop run`, `benchloop dashboard`, `benchloop info`, `benchloop suites`
**Skill:** `~/.openclaw/workspace/skills/benchloop/SKILL.md`

### Quick Commands
```bash
# Speed benchmark on a specific node
benchloop run --model "llamacpp.gguf" --endpoint "http://node1:11434" --provider "openai_compat" --harness "raw" --suites "speed"

# Full benchmark (all suites, takes ~10 min per node)
benchloop run --model "llamacpp.gguf" --endpoint "http://node1:11434" --provider "openai_compat" --harness "raw"

# Launch dashboard
benchloop dashboard

# List available suites
benchloop suites
```

### Our Nodes
- **vllm** — `http://vllm:11434` (2× P6000, ~53 tok/s) — vLLM runtime on gateway
- **pve3090-111** — `http://pve3090-111:11434` (2× RTX 3090, ~102 tok/s) — llama.cpp

All use OpenAI-compatible `/v1/chat/completions` endpoint.

## 🧠 Sub-Agent Model Rule

**All sub-agents use `vllm/llamacpp` (vLLM container on gateway).**
- Single reliable endpoint — no more alternating between two VMs
- vLLM handles GPU scheduling and batching automatically
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

---

## 🧠 Codex Advisor (OpenAI Fallback)

**Agent ID:** `codex-advisor`
**Model:** `openai/gpt-5.4`
**Purpose:** Fallback for tasks that local models can't handle

**When to use:**
- Complex multi-step reasoning that stumps local models
- Research requiring deeper analysis or real-time data
- Tasks where I'm genuinely stuck and need a second opinion
- Anything that benefits from GPT-5.4's capabilities

**How to invoke:**
```bash
sessions_spawn(task="...", agentId="codex-advisor")
```

**Workflow:** When I hit a wall on a local model task, I spawn a subagent targeting `codex-advisor`. The Codex agent handles the task and returns results back to the main session.
<!-- /antfarm:workflows -->
