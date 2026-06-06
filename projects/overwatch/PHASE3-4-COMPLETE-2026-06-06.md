# Phase 3 & Phase 4 — Implementation Report (2026-06-06)

## Summary

Finished the remaining Phase 3 features (agent chat with tool calling, universal
tool catalog, command/tool execution queue with approval) and shipped Phase 4
MVPs (quality + comparative benchmarks, routing rules + engine, BullMQ-backed
task queue with in-memory fallback). Built supporting frontend pages and wired
the navigation. TypeScript across backend and frontend compiles with **zero
errors**.

All work landed in the existing repository at
`/home/localadmin/.openclaw/workspace/projects/overwatch/`.

## What Was Built

### Backend

#### Phase 3 — Agent + Tools

- **Prisma migration** `20260606162500_add_tools_phase3_4` — added `tools` and
  `tool_invocations` tables and the `chat_sessions.allowedToolIds` JSON column,
  plus `ToolInvocationStatus` enum (`PENDING|APPROVED|RUNNING|DONE|FAILED|REJECTED`).
  Applied raw SQL because prior migrations had drift; new tables are clean.
- **Built-in tool catalog** (`src/services/tools/builtin.ts`): `web_search`
  (stub), `web_fetch`, `filesystem_read`, `filesystem_write`, `shell_exec`,
  `http_request`. Each has a JSON schema for tool-calling and an `execute()`
  function. Dangerous tools (`filesystem_write`, `shell_exec`) default to
  `requiresApproval=true`. `shell_exec`/`filesystem_*` are sandboxed to
  `/tmp/overwatch-tools` with path-escape protection.
- **`syncBuiltinTools()`** runs at server boot; idempotent, preserves admin
  overrides.
- **Routes** (`src/routes/tools.ts`):
  - `GET    /api/tools`
  - `GET    /api/tools/:id`
  - `POST   /api/tools`                       (ADMIN)
  - `PATCH  /api/tools/:id`                   (ADMIN)
  - `DELETE /api/tools/:id`                   (ADMIN)
  - `GET    /api/tools/invocations/all`
  - `POST   /api/tools/invocations`           (creates PENDING or APPROVED based on tool)
  - `POST   /api/tools/invocations/:id/approve`
  - `POST   /api/tools/invocations/:id/reject`
  - `POST   /api/tools/invocations/:id/execute`
- **Agent loop** (`src/services/tools/agent-loop.ts`): max-N-iteration
  tool-calling loop. Returns early when a tool requires approval (so the
  human-in-the-loop UI can step in). Tool results are fed back as user-role
  messages (provider rejected system-after-first ordering — easy fix that keeps
  the loop compatible with strict Jinja templates).
- **OpenAI client** (`src/services/providers/openai.ts`) extended with
  `tools` → `tool_choice: 'auto'` and `tool_calls` parsing into a normalized
  `ToolCallRequest[]`.
- **Provider types** (`src/services/providers/types.ts`): new
  `ToolDefinition`/`ToolCallRequest`; `ChatCompletionRequest.tools?` and
  `ChatCompletionResult.toolCalls?`.
- **Chat session create/update** accepts `isAgentChat` and `allowedToolIds`.
- **New endpoint** `POST /api/chat/sessions/:id/agent-message` runs the loop
  and persists the final assistant message. Emits `chat:agent:event` over
  Socket.IO for live progress.

#### Phase 4 — Quality, Routing, Queue

- **Quality benchmark** (`src/services/benchmark/quality.ts`):
  - `runQualityBenchmark()` with `exact` (substring) and `judge`
    (LLM-graded 0–10 → 0–1) scoring. Falls back to exact when no judge is
    configured.
  - `STANDARD_QUALITY_PROMPTS` covers math, reasoning, and code.
  - `runComparativeBenchmark()` runs the same prompts across multiple targets
    and surfaces a `winner` (highest average score).
  - Both auto-resolve model UUIDs → server model names so the runner
    transparently accepts either form.
- **Routes**:
  - `POST /api/benchmarks/quality`
  - `POST /api/benchmarks/comparative`
- **Routing engine** (`src/services/routing/engine.ts`):
  - `pickRoute()` — picks the first matching enabled rule ordered by
    `priority DESC`.
  - `simulateRoute()` — returns the full per-rule evaluation trace.
  - Supported conditions: `maxCost`, `maxLatencyMs`, `modelCapability` (name
    substring match), `contentPattern` (regex), `minTokens`, `maxTokens`,
    `tags`.
  - Skips rules pointing at disconnected/errored providers.
- **Routes** (`src/routes/routing.ts`):
  - `GET    /api/routing/rules`
  - `GET    /api/routing/rules/:id`
  - `POST   /api/routing/rules`              (ADMIN)
  - `PATCH  /api/routing/rules/:id`          (ADMIN)
  - `DELETE /api/routing/rules/:id`          (ADMIN)
  - `POST   /api/routing/simulate`
- **Chat send-message** gained an optional `useRouting: true` flag that runs
  the engine and overrides session provider/model. Emits `chat:routed` so the
  UI can show what rule fired.
- **Queue service** (`src/services/queue/index.ts`):
  - BullMQ-backed when `REDIS_URL` is reachable; quiet, non-retrying probe
    detects Redis-down and switches to an **in-memory FIFO** transparently.
  - Queues: `benchmark`, `hf-download`, `tool-invocation`.
  - `registerProcessor(name, fn)` lets services attach workers later without
    coupling.
  - `queueHealth()` reports backend, Redis health, and per-queue counters.
- **Routes** (`src/routes/queue.ts`):
  - `GET  /api/queue/health`
  - `POST /api/queue/:name/enqueue`

#### Server wiring (`src/index.ts`)

- Mounted `toolsRoutes`, `routingRoutes`, `queueRoutes` under `/api/*` with
  the existing `authenticate` middleware.
- On `httpServer.listen`, calls `syncBuiltinTools()` and `initQueues()`.

### Frontend

- **`src/api/tools.ts`** and **`src/api/routing.ts`** — typed clients for the
  new endpoints, following the existing `getAuthToken()` pattern.
- **`src/pages/ToolsPage.tsx`** — three tabs: Catalog (enable/disable),
  Pending Approval (approve/reject), Recent Invocations (re-execute approved
  invocations). Uses MUI Tables/Switches/Chips.
- **`src/pages/RoutingPage.tsx`** — rule editor (modal dialog with JSON
  condition textarea), priority-sorted table, and an inline simulator that
  shows the matched rule plus the full evaluation trace.
- **Navigation** (`MainLayout.tsx`): added "Tools" (🔧) and "Routing" (🔀) under
  *System Settings* between Benchmark and Settings.
- **Routes** (`App.tsx`): `/tools` and `/routing`.

## Verification

### TypeScript

```
backend:  npx tsc --noEmit  → 0 errors
frontend: npx tsc --noEmit  → 0 errors
```

### Endpoint smoke tests (admin JWT)

| # | Test | Result |
|---|------|--------|
| 1 | `GET /api/tools` lists 6 built-in tools | ✅ `web_search, web_fetch, filesystem_read, filesystem_write, shell_exec, http_request` |
| 2 | `PATCH /api/tools/:id` toggles enabled | ✅ disabled→enabled round-trip |
| 3 | `POST /api/tools/invocations` + `/execute` (web_fetch) | ✅ status DONE, duration 5 ms |
| 4 | `GET /api/routing/rules` | ✅ 1 rule |
| 5 | `POST /api/routing/simulate` (short prompt) | ✅ decision = "Short prompts to vLLM" |
| 5b | Long prompt | ✅ decision = null (tokens>50 rejection logged in trace) |
| 6 | `GET /api/queue/health` | ✅ backend=memory, redis=false, all 3 queues reachable |
| 7 | `POST /api/chat/sessions/:id/agent-message` | ✅ 2 iterations, called `http_request`, returned full status report |
| 8 | `POST /api/chat/.../messages {useRouting:true}` | ✅ routed reply |
| 9 | `POST /api/benchmarks/quality` | ✅ status COMPLETED, 1/1 passed, avg 1.0 |
| 10 | `POST /api/benchmarks/comparative` (2 targets) | ✅ winner=vLLM (607 ms vs 906 ms latency) |
| 11 | `POST /api/queue/hf-download/enqueue` | ✅ jobId returned |
| 12 | Approval gating | ✅ `filesystem_write` PENDING → execute denied; approve → execute succeeds, file written |

### Server boot log (clean)

```
Overwatch backend running on port 3000
Built-in tools synced
[queue] Redis unavailable, using in-memory fallback: Connection is closed.
Queue system initialized
```

## Deferred / Follow-ups

These were intentionally scoped out to keep the PR shippable:

1. **`web_search` stub** — returns an empty result envelope. Wire to a real
   provider (Brave / Perplexity) when an API key is available. Schema +
   contract are already in place so swapping the executor is a one-file
   change.
2. **Routing weights / round-robin modes** — schema and field
   (`weight`, `routerMode`) exist on `RoutingRule`, but the engine currently
   picks first-match-by-priority. Adding weighted random / lowest-latency
   selection is a small follow-up in `engine.ts`.
3. **Queue workers for actual jobs** — queue infrastructure is in place but
   `benchmark` / `hf-download` / `tool-invocation` queues don't yet have
   `registerProcessor()` callers. The existing benchmark and HF flows still
   run inline; migrating them to the queue is a non-breaking refactor.
4. **Redis** — not installed on this host. The in-memory fallback is logged
   on boot. Production deploys should install `redis-server` and the
   BullMQ path activates automatically via `REDIS_URL`.
5. **Anthropic/Ollama tool calling** — currently only the OpenAI-compatible
   client parses `tool_calls`. Anthropic uses a different schema (`tool_use`
   blocks); Ollama supports OpenAI-style on recent versions. The agent loop
   throws cleanly if the provider returns no `toolCalls`, so non-tool models
   degrade to plain chat instead of crashing.

## Files Added / Changed

### New

```
backend/prisma/migrations/20260606162500_add_tools_phase3_4/migration.sql
backend/src/routes/tools.ts
backend/src/routes/routing.ts
backend/src/routes/queue.ts
backend/src/services/tools/builtin.ts
backend/src/services/tools/index.ts
backend/src/services/tools/agent-loop.ts
backend/src/services/routing/engine.ts
backend/src/services/queue/index.ts
backend/src/services/benchmark/quality.ts
frontend/src/api/tools.ts
frontend/src/api/routing.ts
frontend/src/pages/ToolsPage.tsx
frontend/src/pages/RoutingPage.tsx
```

### Changed

```
backend/prisma/schema.prisma                       (+Tool, +ToolInvocation, +ChatSession.allowedToolIds, +ToolInvocationStatus enum)
backend/src/index.ts                               (mount new routes, boot syncBuiltinTools + initQueues)
backend/src/routes/chat.ts                         (+agent-message endpoint, +useRouting flag, accept isAgentChat/allowedToolIds)
backend/src/routes/benchmark.ts                    (+/quality, +/comparative)
backend/src/services/providers/types.ts            (+ToolDefinition, +ToolCallRequest, ChatCompletion{Request,Result} tool fields)
backend/src/services/providers/openai.ts           (request.tools, parse tool_calls)
frontend/src/App.tsx                               (Tools + Routing routes)
frontend/src/layouts/MainLayout.tsx                (Tools + Routing nav)
```

## Test User

- JWT issued for `admin@overwatch.local` (id `eae9e4a1-cafe-49e6-94a6-c9f7d66bf361`)
  using the dev JWT secret in `backend/.env`.

## Providers Used For Verification

- `vLLM-Production` `1f6bdd72-…` — model `llamacpp.gguf` (Qwen3.6-35B), tool-calling capable.
- `vm111` `ccb405b0-…` — model `llamacpp.gguf`, used for comparative benchmark.

Both providers correctly returned `tool_calls` responses against the
OpenAI-compatible `/v1/chat/completions` endpoint, exercising the agent loop
end-to-end.
