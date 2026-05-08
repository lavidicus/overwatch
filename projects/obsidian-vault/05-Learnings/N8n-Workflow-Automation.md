# N8n Workflow Automation

**Date:** 2026-05-08
**Source:** PKB/resources/n8n-workflow-automation.md
**Tags:** #n8n #automation #workflow #api #openclaw

## What is N8n?
N8n is a self-hosted workflow automation platform. It provides:
- Visual workflow builder (drag-and-drop nodes)
- Webhook triggers for external integration
- 400+ built-in integrations (Gmail, Slack, HTTP, Code, etc.)
- REST API for programmatic workflow management
- Execution history and debugging

**Our deployment:** N8n v2.13.4 on `ocg` host, systemd-managed, port 5678.

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

## Workflow Design Patterns

### Pattern 1: Webhook → Process → Report
```
[Webhook Trigger] → [Code: Process] → [HTTP: Report to Sam]
```

---
*Created: 2026-05-08 | Last updated: 2026-05-08*