# N8n Workflow Automation — Knowledge Base

**Type:** Concept Note
**Area:** Infrastructure / Automation
**Created:** 2026-03-28
**Tags:** #n8n #automation #workflow #api #openclaw

---

## What is N8n?

N8n is a self-hosted workflow automation platform. It provides:
- Visual workflow builder (drag-and-drop nodes)
- Webhook triggers for external integration
- 400+ built-in integrations (Gmail, Slack, HTTP, Code, etc.)
- REST API for programmatic workflow management
- Execution history and debugging

**Our deployment:** N8n v2.13.4 on `ocg` host, systemd-managed, port 5678.

---

## Architecture: OpenClaw + N8n

```
Jeremy (Human)
    │
    ├──▶ N8n Web UI (visual supervision, debugging)
    │    http://ocg.9xc.local:5678
    │
    └──▶ OpenClaw/Sam (conversational interface)
         │
         ├── Trigger workflows via webhook
         │   POST http://ocg.9xc.local:5678/webhook/{path}
         │
         ├── Manage workflows via API
         │   GET/POST/PUT/DELETE /api/v1/workflows
         │   Header: X-N8N-API-KEY
         │
         └── Receive results via HTTP callback
             POST http://ocg.9xc.local:18789/api/messages
```

**Design principle:** Sam is the brain (decides what to do), N8n is the executor (runs deterministic multi-step processes). Jeremy supervises via the visual UI.

---

## Why N8n + OpenClaw?

| Capability | OpenClaw (Sam) | N8n |
|-----------|---------------|-----|
| Natural language understanding | ✅ | ❌ |
| Deterministic multi-step execution | ❌ (probabilistic) | ✅ |
| Visual debugging | ❌ | ✅ |
| Retry/error handling | Manual | Built-in |
| Scheduling (cron) | ✅ (basic) | ✅ (visual) |
| OAuth credential management | ❌ | ✅ |
| Human supervision | Chat-based | Visual UI |

**Key insight:** LLMs are great at deciding *what* to do but unreliable for *deterministic execution* of multi-step processes. N8n handles the deterministic part with visual audit trails.

---

## N8n API Reference (v2.x)

### Authentication
```
Header: X-N8N-API-KEY: <jwt_token>
```
- NOT `Authorization: Bearer`
- NOT basic auth
- API keys are created in N8n UI → Settings → API

### Endpoints

| Action | Method | Path |
|--------|--------|------|
| List workflows | GET | `/api/v1/workflows` |
| Get workflow | GET | `/api/v1/workflows/{id}` |
| Create workflow | POST | `/api/v1/workflows` |
| Update workflow | PUT | `/api/v1/workflows/{id}` |
| Delete workflow | DELETE | `/api/v1/workflows/{id}` |
| **Activate** | POST | `/api/v1/workflows/{id}/activate` |
| **Deactivate** | POST | `/api/v1/workflows/{id}/deactivate` |
| Trigger webhook | POST | `/webhook/{path}` |

### Critical Rules
1. `active` field is **READ-ONLY** in PUT requests
2. Must use separate `/activate` endpoint
3. Webhooks take 3-8 seconds to register after activation
4. Always use `ocg.9xc.local` hostname, never `localhost`

---

## Workflow Design Patterns

### Pattern 1: Webhook → Process → Report

```
[Webhook Trigger] → [Code: Process] → [HTTP: Report to Sam]
```

Use for: On-demand tasks triggered by Sam (email checks, status queries).

### Pattern 2: Schedule → Fetch → Filter → Notify

```
[Cron Trigger] → [Gmail: Fetch] → [Code: Filter] → [HTTP: Notify Sam]
```

Use for: Periodic monitoring (daily email check, git status).

### Pattern 3: Webhook → Branch → Multiple Actions

```
                    ┌→ [Gmail: Send]
[Webhook] → [Switch] 
                    └→ [HTTP: API Call]
```

Use for: Multi-action workflows based on input parameters.

---

## Instance-Level MCP Integration

N8n exposes an MCP (Model Context Protocol) server that lets AI clients discover and execute workflows.

### MCP Server Details
- **Endpoint:** `http://ocg.9xc.local:5678/mcp-server/http`
- **Transport:** Streamable HTTP (not SSE)
- **Auth:** `Authorization: Bearer <MCP_ACCESS_TOKEN>`
- **Token source:** N8n UI → Settings → Instance-level MCP → Connection details → Access Token tab
- **Token audience:** `mcp-server-api` (different from public API key)

### Two Auth Systems

| System | Header | Token Audience | Endpoint Prefix |
|--------|--------|---------------|-----------------|
| Public API | `X-N8N-API-KEY: <token>` | `public-api` | `/api/v1/` |
| MCP Server | `Authorization: Bearer <token>` | `mcp-server-api` | `/mcp-server/http` |
| Internal REST | Session cookie (browser) | N/A | `/rest/mcp/` |

**Never mix tokens between systems.**

### OpenClaw MCP Client Config
```bash
openclaw mcp set n8n '{"url":"http://ocg.9xc.local:5678/mcp-server/http","headers":{"Authorization":"Bearer <TOKEN>"}}'
openclaw gateway restart
```

### MCP Tools Available
Once connected, OpenClaw gains these N8n MCP tools:
- `search_workflows` — Find workflows exposed to MCP
- `execute_workflow` — Trigger a workflow
- `get_execution` — Check execution results
- `get_workflow_details` — Inspect workflow nodes/connections
- `publish_workflow` / `unpublish_workflow` — Manage workflow state

### Workflow Eligibility for MCP
Workflows must be:
1. **Published** (not just saved/active)
2. **Have a supported trigger** (Webhook, Schedule, Chat, Form)
3. **MCP toggled on** (workflow Settings → Available in MCP)

---

## Installed Workflows

| ID | Name | Trigger | Status | Description |
|----|------|---------|--------|-------------|
| DhkZuCVrGM3tKuZk | Daily Email Monitor | Webhook `/sam-trigger` | ✅ Active | Email check for ops@claw-sync.com via gog-bridge |

---

## Gog Bridge Service

N8n Code nodes are sandboxed — `child_process` is blocked. To run CLI tools like `gog`, use the HTTP bridge:

```
N8n HTTP Request → http://127.0.0.1:18790/fetch-emails → gog CLI → Gmail API
```

- **Service:** `gog-bridge.service` (systemd)
- **Script:** `/home/localadmin/.n8n/scripts/gog-bridge.js`
- **Port:** 18790 (IPv4 only — use `127.0.0.1`, never `localhost`)
- **Endpoints:** `/fetch-emails`, `/health`
- **Management:** `sudo systemctl {start|stop|restart|status} gog-bridge`

---

## Operational Notes

### Service Management
```bash
sudo systemctl status n8n    # Check status
sudo systemctl restart n8n   # Restart (webhooks re-register in ~8s)
sudo systemctl stop n8n      # Stop
sudo journalctl -u n8n -f    # Live logs
```

### Health Check
```bash
curl -s http://ocg.9xc.local:5678/rest/settings | python3 -c "import sys,json; print('OK')" 2>/dev/null && echo "N8n: UP" || echo "N8n: DOWN"
```

### Backup
```bash
# Backup N8n data (SQLite database + credentials)
cp -r /home/localadmin/.n8n/data /backup/n8n-$(date +%Y%m%d)/
```

---

## Lessons Learned (2026-03-28)

1. **N8n v2 uses `/api/v1/` not `/rest/`** — `/rest/` is internal and returns HTML errors
2. **Auth header is `X-N8N-API-KEY`** — NOT `Authorization: Bearer`, NOT basic auth
3. **`active` is read-only in PUT** — must use `POST /activate` endpoint
4. **When a user registers via UI, basic auth is bypassed** — N8n switches to session-based auth
5. **Webhook registration is async** — wait 12+ seconds after n8n restart before testing
6. **Always use FQDN `ocg.9xc.local`** — `localhost` causes cookie/CORS issues
7. **MCP token ≠ Public API key** — Different `aud` claims, different headers, different endpoints
8. **MCP endpoint is `/mcp-server/http`** — Streamable HTTP transport, not SSE
9. **Internal `/rest/mcp/` settings require browser session auth** — cannot enable MCP via API
10. **OpenClaw MCP config:** `openclaw mcp set <name> '{"url":"...","headers":{...}}'`
11. **`webhookId` is REQUIRED** on webhook nodes in N8n v2 — without it, webhooks never register
12. **Duplicate webhook paths conflict** — only one workflow can use each path; delete extras
13. **Code nodes are sandboxed** — `child_process`, `fs`, `net` are all blocked by the task runner
14. **Use gog-bridge HTTP pattern** — wrap CLI tools in a local HTTP service on port 18790
15. **Use `127.0.0.1` not `localhost`** in HTTP Request nodes — N8n resolves localhost to IPv6 `::1`
16. **Restart n8n after API workflow creation** — draft workflows don't register webhooks until restart
17. **Write JSON to file, use `curl -d @file`** — avoids shell escaping issues with inline JSON
18. **Always check n8n logs after restart** — `journalctl -u n8n -n 20` shows activation status

---

## Cross-References

- **ITIL Playbook:** `ITIL/playbooks/openclaw-n8n-integration.md`
- **Integration Script:** `scripts/sam-n8n-integration.sh`
- **OpenClaw Config:** `~/.openclaw/openclaw.json` → `skills.entries.n8n-mcp`
- **N8n Service:** `/etc/systemd/system/n8n.service`
- **N8n Data:** `/home/localadmin/.n8n/`

---

*This note is part of the PKB (Personal Knowledge Base). Update when N8n version changes or new patterns emerge.*
