# PLAYBOOK: OpenClaw ↔ N8n Integration

**Created:** 2026-03-28
**Author:** Sam (ocg)
**Status:** Active
**Severity:** P3 - Standard Operations
**Audience:** Qwen3.5 / any model running on ocg

---

## Purpose

This playbook documents the correct procedures for interacting with N8n v2.x from OpenClaw. **Read this before any N8n API call.**

---

## 1. Architecture

```
┌──────────────┐     HTTP/API      ┌──────────────┐
│   OpenClaw   │ ──────────────▶   │    N8n v2    │
│   (Sam/ocg)  │                   │  Port 5678   │
│              │ ◀────────────── │              │
│  Port 18789  │    Webhooks       │  Workflows   │
└──────────────┘                   └──────────────┘
```

- **N8n URL:** `http://ocg.9xc.local:5678` (NEVER use `localhost`)
- **N8n Owner:** Jeremy Ingalls (`jeremy.ingalls@gmail.com`)
- **N8n Service:** systemd (`n8n.service`)
- **N8n Data:** `/home/localadmin/.n8n/`
- **N8n Version:** 2.13.4+
- **API Key Location:** `openclaw.json` → `skills.entries.n8n-mcp.config.apiKey`

---

## 2. Authentication

### ✅ CORRECT

```bash
curl -X GET "http://ocg.9xc.local:5678/api/v1/workflows" \
  -H "X-N8N-API-KEY: <api_key>"
```

### ❌ WRONG — DO NOT USE

```bash
# WRONG: Bearer token
curl -H "Authorization: Bearer <api_key>" ...

# WRONG: Basic auth
curl -u "n8n:password" ...

# WRONG: /rest/ endpoint
curl "http://ocg.9xc.local:5678/rest/workflows" ...
```

**Key facts:**
- Header name is `X-N8N-API-KEY` (case-sensitive)
- NOT `Authorization: Bearer`
- NOT basic auth (Jeremy registered via UI, basic auth is disabled)

---

## 3. API Endpoints

### Base URL
```
http://ocg.9xc.local:5678/api/v1
```

### Workflow CRUD

| Action | Method | Endpoint | Notes |
|--------|--------|----------|-------|
| List all | GET | `/workflows` | Returns `{data: [], nextCursor}` |
| Get one | GET | `/workflows/{id}` | Full workflow with nodes |
| Create | POST | `/workflows` | Returns created workflow with `id` |
| Update | PUT | `/workflows/{id}` | `active` field is READ-ONLY here |
| Delete | DELETE | `/workflows/{id}` | Permanent deletion |
| **Activate** | POST | `/workflows/{id}/activate` | ⚠️ Separate endpoint! |
| **Deactivate** | POST | `/workflows/{id}/deactivate` | ⚠️ Separate endpoint! |

### ⚠️ CRITICAL: Activating Workflows

The `active` field is **READ-ONLY** in PUT requests. You MUST use:

```bash
# Activate
curl -X POST "http://ocg.9xc.local:5678/api/v1/workflows/{id}/activate" \
  -H "X-N8N-API-KEY: <key>"

# Deactivate
curl -X POST "http://ocg.9xc.local:5678/api/v1/workflows/{id}/deactivate" \
  -H "X-N8N-API-KEY: <key>"
```

Setting `"active": true` in the POST/PUT body does **nothing**.

### Webhook Endpoints

```bash
# Trigger a webhook (no API key needed for production webhooks)
curl -X POST "http://ocg.9xc.local:5678/webhook/{path}" \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

### Executions

| Action | Method | Endpoint |
|--------|--------|----------|
| List | GET | `/executions` |
| Get one | GET | `/executions/{id}` |

---

## 4. Creating a Workflow (Step-by-Step)

### Step 1: Create the workflow (inactive)

```bash
API_KEY="<your_key>"

curl -s -X POST "http://ocg.9xc.local:5678/api/v1/workflows" \
  -H "X-N8N-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
  "name": "My Workflow",
  "nodes": [
    {
      "parameters": {"httpMethod": "POST", "path": "my-webhook", "responseMode": "lastNode", "options": {}},
      "name": "Webhook Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250, 300],
      "webhookId": "my-webhook"
    },
    {
      "parameters": {"jsCode": "return [{ json: { ok: true } }];"},
      "name": "Process",
      "type": "n8n-nodes-base.code",
      "typeVersion": 2,
      "position": [500, 300]
    }
  ],
  "connections": {
    "Webhook Trigger": {"main": [[{"node": "Process", "type": "main", "index": 0}]]}
  },
  "settings": {"executionOrder": "v1"}
}'
```

Save the returned `id`.

### Step 2: Activate the workflow

```bash
curl -s -X POST "http://ocg.9xc.local:5678/api/v1/workflows/{id}/activate" \
  -H "X-N8N-API-KEY: $API_KEY"
```

### Step 3: Wait for webhook registration

N8n takes 3-8 seconds after activation to register webhooks. Always `sleep 5` before testing.

### Step 4: Test the webhook

```bash
curl -s -X POST "http://ocg.9xc.local:5678/webhook/my-webhook" \
  -H "Content-Type: application/json" \
  -d '{"test": true}'
```

---

## 5. Instance-Level MCP Connection

N8n provides an Instance-level MCP server that allows AI clients (like OpenClaw) to discover, inspect, and execute workflows through MCP protocol.

### MCP vs Public API

| Feature | Public API (`/api/v1/`) | MCP Server (`/mcp-server/http`) |
|---------|------------------------|-------------------------------|
| Auth header | `X-N8N-API-KEY` | `Authorization: Bearer` |
| Token audience | `public-api` | `mcp-server-api` |
| Token source | Settings → API | Settings → Instance-level MCP → Connection details → Access Token |
| Transport | REST JSON | Streamable HTTP (MCP protocol) |
| Purpose | CRUD workflows, manage | Discover + execute exposed workflows |

### MCP Architecture

```
OpenClaw (MCP Client)
    │
    POST /mcp-server/http
    Header: Authorization: Bearer <MCP_ACCESS_TOKEN>
    │
    ▼
N8n MCP Server (Streamable HTTP)
    │
    ├── search_workflows — find MCP-exposed workflows
    ├── execute_workflow — trigger workflows
    ├── get_execution — check execution results
    ├── get_workflow_details — inspect nodes/connections
    ├── publish_workflow — publish a workflow
    └── unpublish_workflow — unpublish a workflow
```

### Enabling MCP (requires N8n Web UI)

1. Go to `http://ocg.9xc.local:5678`
2. Settings → Instance-level MCP
3. Toggle **"Enable MCP access"** ON
4. Click **"Connection details"** → **"Access Token"** tab
5. Copy the token (shown only once!)

### Exposing Workflows to MCP

Workflows must be:
- **Published** (not just active — published via the Publish button)
- **Have a supported trigger** (Webhook, Schedule, Chat, or Form)
- **MCP toggled on** per-workflow (Settings → Available in MCP)

### Configuring OpenClaw MCP Client

```bash
# Set the MCP server connection
openclaw mcp set n8n '{"url":"http://ocg.9xc.local:5678/mcp-server/http","headers":{"Authorization":"Bearer <MCP_ACCESS_TOKEN>"}}'

# Verify
openclaw mcp show n8n

# Remove
openclaw mcp unset n8n

# List all configured MCP servers
openclaw mcp list
```

After setting, restart the gateway:
```bash
openclaw gateway restart
```

### ⚠️ MCP Token vs Public API Key

These are **different tokens** with different audiences:
- **Public API Key** (`aud: "public-api"`) → Use with `X-N8N-API-KEY` header for `/api/v1/` endpoints
- **MCP Access Token** (`aud: "mcp-server-api"`) → Use with `Authorization: Bearer` header for `/mcp-server/http`

**Do NOT mix them.** The Public API key will not work with MCP and vice versa.

### ⚠️ Internal REST API (`/rest/mcp/`)

The MCP settings endpoints (`/rest/mcp/settings`, `/rest/mcp/api-key`) require **session auth** (browser login cookie). Neither the Public API key nor the MCP token works with these endpoints. MCP must be enabled/configured through the N8n Web UI.

---

## 6. Common Node Types

### Webhook (Trigger)
```json
{
  "parameters": {"httpMethod": "POST", "path": "my-path", "responseMode": "lastNode"},
  "name": "My Trigger",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "position": [250, 300],
  "webhookId": "my-path"
}
```

### Code (JavaScript)
```json
{
  "parameters": {"jsCode": "const data = $input.first().json;\nreturn [{ json: { result: data } }];"},
  "name": "My Code",
  "type": "n8n-nodes-base.code",
  "typeVersion": 2,
  "position": [500, 300]
}
```

### HTTP Request
```json
{
  "parameters": {"method": "POST", "url": "http://ocg.9xc.local:18789/api/messages", "sendBody": true, "bodyParameters": {"parameters": [{"name": "message", "value": "={{ $json.result }}"}]}},
  "name": "Send to OpenClaw",
  "type": "n8n-nodes-base.httpRequest",
  "typeVersion": 1,
  "position": [750, 300]
}
```

### Gmail (requires OAuth2 credential configured in UI)
```json
{
  "parameters": {"operation": "list", "resource": "email", "filter": "to:ops@claw-sync.com newer_than:1d"},
  "name": "Fetch Emails",
  "type": "n8n-nodes-base.gmail",
  "typeVersion": 2,
  "position": [500, 300]
}
```

---

## 7. Connection Format

```json
{
  "connections": {
    "Node A Name": {
      "main": [
        [
          {"node": "Node B Name", "type": "main", "index": 0}
        ]
      ]
    }
  }
}
```

- Key = source node name (exact match)
- Value = array of output ports → array of connections
- `"index": 0` = first input of target node

---

## 8. Troubleshooting

### "Internal Server Error" on POST /rest/workflows
**Cause:** Wrong endpoint. Use `/api/v1/workflows` not `/rest/workflows`.

### "Unauthorized" 
**Cause:** Wrong auth header. Use `X-N8N-API-KEY` not `Authorization: Bearer`.

### "The requested webhook is not registered"
**Causes:**
1. Workflow not activated (use `POST /activate`)
2. N8n hasn't loaded the workflow yet — **must restart n8n after creating via API**, then wait 8+ seconds
3. Webhook node missing `webhookId` field (REQUIRED in v2)
4. Duplicate workflows with same webhook path (delete extras)
5. Workflow was deleted

**Fix checklist:**
```bash
# 1. Check workflow exists and is active
curl -s "http://ocg.9xc.local:5678/api/v1/workflows/{id}" \
  -H "X-N8N-API-KEY: $API_KEY" | python3 -c "
import sys,json; d=json.load(sys.stdin)
print(f'Active: {d[\"active\"]}  TriggerCount: {d.get(\"triggerCount\",0)}')"

# 2. Check only ONE workflow uses the webhook path
curl -s "http://ocg.9xc.local:5678/api/v1/workflows" \
  -H "X-N8N-API-KEY: $API_KEY" | python3 -c "
import sys,json
for w in json.load(sys.stdin)['data']:
    for n in w.get('nodes',[]):
        if 'webhook' in n['type']:
            print(f'{w[\"id\"]} ({w[\"active\"]}) path={n[\"parameters\"].get(\"path\")} webhookId={n.get(\"webhookId\",\"MISSING\")}')"

# 3. Restart n8n and wait
sudo systemctl restart n8n && sleep 12

# 4. Check logs for activation
sudo journalctl -u n8n -n 20 --no-pager | grep -E "Activated|Processed"
```

### "request/body/active is read-only"
**Cause:** Tried to set `active` via PUT. Use `POST /activate` instead.

### "Unrecognized node type: n8n-nodes-base.executeCommand"
**Cause:** The `executeCommand` node type is blocked in N8n v2.13+ task runner.
**Fix:** Use an HTTP Request node that calls a local bridge service instead.

### "Module 'child_process' is disallowed"
**Cause:** N8n's Code node runs in a sandboxed task runner that blocks `require('child_process')`, `require('fs')`, etc.
**Fix:** Do NOT use Code nodes for shell commands. Use the gog-bridge HTTP service pattern (see Section 12).

### "ECONNREFUSED ::1:18790" (IPv6 localhost)
**Cause:** N8n resolves `localhost` to IPv6 `::1` but the bridge listens on IPv4 `127.0.0.1`.
**Fix:** Always use `http://127.0.0.1:PORT` in HTTP Request nodes, never `http://localhost:PORT`.

### Workflow shows in API but not in UI
**Cause:** Workflow was created by API under the API key owner's account. It appears in the "Personal" workspace of the account that owns the API key.

### ⚠️ CRITICAL: webhookId field
**N8n v2 requires `webhookId` on webhook nodes.** Without it, the webhook will never register even if the workflow is active. Always include it:
```json
{
  "name": "My Trigger",
  "type": "n8n-nodes-base.webhook",
  "typeVersion": 2,
  "webhookId": "unique-id-here"
}
```

### ⚠️ CRITICAL: Restart after API workflow creation
Workflows created via API are "draft" workflows. N8n only registers their webhooks **after a restart**. Sequence:
1. Create workflow via API
2. Activate via `POST /activate`
3. **Restart n8n:** `sudo systemctl restart n8n`
4. Wait 12 seconds for startup + activation
5. Test webhook

---

## 9. Integration Helper Script

Location: `/home/localadmin/.openclaw/workspace/scripts/sam-n8n-integration.sh`

```bash
source /home/localadmin/.openclaw/workspace/scripts/sam-n8n-integration.sh

# List workflows
n8n_api GET /workflows

# Create workflow
n8n_api POST /workflows '{"name":"test",...}'

# Activate
n8n_api POST /workflows/{id}/activate

# Trigger webhook
n8n_webhook sam-trigger '{"task":"check_email"}'
```

---

## 10. Current Workflows

| ID | Name | Webhook Path | Status |
|----|------|-------------|--------|
| DhkZuCVrGM3tKuZk | Daily Email Monitor | /webhook/sam-trigger | ✅ Active |

---

## 11. Gog Bridge Service (Shell Command Proxy)

N8n's Code nodes run in a sandbox that blocks `child_process`, `fs`, etc. To run CLI tools like `gog`, use a local HTTP bridge service.

### Architecture
```
N8n Workflow (HTTP Request node)
    │
    GET http://127.0.0.1:18790/fetch-emails
    │
    ▼
gog-bridge.service (Node.js HTTP server, port 18790)
    │
    exec: /home/linuxbrew/.linuxbrew/bin/gog gmail messages search ...
    │
    ▼
Gmail API (via gog OAuth credentials for ops@claw-sync.com)
```

### Key files
- Bridge script: `/home/localadmin/.n8n/scripts/gog-bridge.js`
- Systemd service: `/etc/systemd/system/gog-bridge.service`
- Service management: `sudo systemctl {start|stop|restart|status} gog-bridge`

### ⚠️ CRITICAL: Use `127.0.0.1` not `localhost`
N8n resolves `localhost` to IPv6 `::1`. The bridge only listens on IPv4. Always use `http://127.0.0.1:18790` in HTTP Request nodes.

### Adding new gog endpoints
Edit `/home/localadmin/.n8n/scripts/gog-bridge.js` and add routes. Restart with `sudo systemctl restart gog-bridge`.

---

## 12. N8n Code Node Constraints

The N8n task runner sandboxes Code nodes. The following are **BLOCKED**:
- `require('child_process')` — use gog-bridge HTTP pattern instead
- `require('fs')` — use HTTP Request node to read files
- `require('net')` — use HTTP Request node
- Any Node.js built-in that accesses the OS

**Safe to use in Code nodes:**
- `$input`, `$json`, `$node` — N8n context objects
- `JSON.parse()`, `JSON.stringify()` — data processing
- `new Date()` — timestamps
- String/Array/Object methods — data manipulation
- `console.log()` — debugging (visible in execution logs)

---

## 13. Checklist: Before Any N8n API Call

- [ ] Using `http://ocg.9xc.local:5678` (not localhost)
- [ ] Using `/api/v1/` endpoint (not `/rest/`)
- [ ] Using `X-N8N-API-KEY` header (not Bearer)
- [ ] NOT trying to set `active` in PUT body
- [ ] Using `POST /activate` to activate workflows
- [ ] Webhook node has `webhookId` field set
- [ ] Only ONE workflow uses each webhook path (no duplicates)
- [ ] Restarting n8n after creating workflows via API
- [ ] Waiting 12+ seconds after restart before testing webhooks
- [ ] HTTP Request nodes use `127.0.0.1` not `localhost` for local services
- [ ] Code nodes do NOT use `require('child_process')` or other blocked modules
- [ ] gog-bridge service is running (`systemctl status gog-bridge`)

---

## 14. Complete Workflow Creation Recipe

```bash
API_KEY="<key>"

# 1. Write workflow JSON to file (avoids shell escaping issues)
cat > /tmp/my-workflow.json << 'EOF'
{
  "name": "My Workflow",
  "nodes": [
    {
      "parameters": {"httpMethod":"POST","path":"my-path","responseMode":"lastNode","options":{}},
      "name": "Trigger",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [250,300],
      "webhookId": "my-unique-id"
    }
  ],
  "connections": {},
  "settings": {"executionOrder":"v1"}
}
EOF

# 2. Create via API (use -d @file to avoid escaping)
WF_ID=$(curl -s -X POST "http://ocg.9xc.local:5678/api/v1/workflows" \
  -H "X-N8N-API-KEY: $API_KEY" \
  -H "Content-Type: application/json" \
  -d @/tmp/my-workflow.json | python3 -c "import sys,json; print(json.load(sys.stdin)['id'])")

# 3. Activate
curl -s -X POST "http://ocg.9xc.local:5678/api/v1/workflows/$WF_ID/activate" \
  -H "X-N8N-API-KEY: $API_KEY" > /dev/null

# 4. Restart n8n (required for webhook registration)
sudo systemctl restart n8n
sleep 12

# 5. Test
curl -s -X POST "http://ocg.9xc.local:5678/webhook/my-path" \
  -H "Content-Type: application/json" -d '{}'
```

---

*Last updated: 2026-03-28 17:56 UTC by Sam (ocg/opus)*
