# Overwatch Phase 3 Implementation Plan: Chat & Proxy

**Status:** Ready to Build (Phase 2 verified 2026-06-06)
**Target Window:** Weeks 5–6
**Author:** codex-advisor
**Date:** 2026-06-06
**Phase 2 Verified By:** Sam (cron overwatch-phase1-build)

---

# Section 1: Executive Summary + Dependency Order

## Phase 3 Implementation Plan: Chat & Proxy

**Critical path:** Provider Client Abstraction → AI Proxy → Chat Sessions → Chat UI → Benchmarks

**Week 5 (Chat):**
- Day 1-2: Provider clients
- Day 2-3: AI proxy
- Day 3-4: Chat CRUD
- Day 4-5: Socket.io events
- Day 5-7: ChatPage UI

**Week 6 (Benchmark):**
- Day 1-2: Benchmark service
- Day 2-3: Benchmark routes + SSE
- Day 3-5: BenchmarkPage UI
- Day 5-7: Polish

---

# Section 2: Backend Files — Provider Client Abstraction

**`backend/src/services/providers/types.ts`** (~80 lines)
Types: `ChatMessage`, `ChatCompletionRequest`, `ChatCompletionChunk`, `ChatCompletionResult`, `ProviderClient` interface.

**`backend/src/services/providers/base.ts`** (~60 lines)
Abstract `BaseProviderClient` with shared error handling, timeout, retry-once-on-429, `decryptApiKey` helper.

**`backend/src/services/providers/openai.ts`** (~180 lines)
OpenAI-compatible: `fetch ${baseUrl}/chat/completions`, SSE streaming, usage tokens.

**`backend/src/services/providers/anthropic.ts`** (~180 lines)
`POST ${baseUrl}/v1/messages` with `anthropic-version` header, SSE `content_block_delta` parsing, system msg handling.

**`backend/src/services/providers/ollama.ts`** (~140 lines)
`POST ${baseUrl}/api/chat`, NDJSON streaming.

**`backend/src/services/providers/index.ts`** (~60 lines)
Factory: `getProviderClient(provider)`, cache by `provider.id`, `listSupportedTypes()`.

---

# Section 3: Backend Files — Routes

**`backend/src/routes/ai-proxy.ts`** (~150 lines)
- `POST /api/ai/chat/completions` — OpenAI-compatible passthrough, SSE or JSON response
- `POST /api/ai/test` — test connection `{providerId}`

**`backend/src/routes/chat.ts`** (~280 lines)
- `GET    /api/chat/sessions` — list user sessions (paginated, `updatedAt desc`)
- `POST   /api/chat/sessions` — create session with optional provider/model/temperature
- `GET    /api/chat/sessions/:id` — get session + last N messages (`?limit=`)
- `PATCH  /api/chat/sessions/:id` — update session properties
- `DELETE /api/chat/sessions/:id` — delete session (cascade messages)
- `GET    /api/chat/sessions/:id/messages` — paginated history
- `POST   /api/chat/sessions/:id/messages` — **MAIN endpoint**: persist user msg, call provider via ai-proxy, persist assistant msg, stream SSE + Socket.io events, auto-generate session title from first message

**`backend/src/routes/chat-group.ts`** (~30 lines)
**STUB:** all endpoints return `501 Not Implemented`, reserves URL space for Phase 4.

**`backend/src/routes/benchmark.ts`** (~180 lines)
- `GET    /api/benchmarks` — list runs paginated
- `GET    /api/benchmarks/:id` — full result
- `POST   /api/benchmarks` — create + start, returns `{id, status: 'queued'}`, spawns runner
- `GET    /api/benchmarks/:id/stream` — SSE: `progress`, `run-complete`, `done`, `error`
- `DELETE /api/benchmarks/:id` — cancel or delete

---

# Section 4: Backend Files — Benchmark Service

**`backend/src/services/benchmark/runner.ts`** (~250 lines)
`runBenchmark(params, onEvent)`: measure TTFT, total latency, tokens/sec per run, compute aggregates mean/median/p95, quality mode stores responses for human eval, don't abort on one failure.

**`backend/src/services/benchmark/prompts.ts`** (~40 lines)
Built-in prompt sets: `STANDARD_PROMPTS`, `CODING_PROMPTS`, `REASONING_PROMPTS`.

---

# Section 5: Server Wiring

**Edit `backend/src/index.ts`** (+10 lines)
```typescript
app.use('/api/ai', aiProxyRouter);
app.use('/api/chat', chatRouter);
app.use('/api/benchmarks', benchmarkRouter);
```

**Edit `backend/src/index.ts` Socket.io section** (+40 lines)
- Client → server: `chat:join {sessionId}`, `chat:leave {sessionId}`
- Server → client: `chat:message:delta`, `chat:message:complete`, `chat:system` (typing indicator)
- Verify `sessionId` ownership before joining room

---

# Section 6: Frontend Files

**`frontend/src/pages/ChatPage.tsx`** (~450 lines)
Chat interface with: sidebar (session list), message list with role bubbles, input area with send button, streaming indicator, session create/edit/delete.
Uses react-router-dom v7, MUI 6 (`TextField`, `Button`, `Paper`, `List`, `ListItem`, `Avatar`).
Socket.io connection with JWT token, joins `chat:room:{sessionId}`.
Auto-scroll on new messages, markdown rendering for assistant messages.

**`frontend/src/pages/BenchmarkPage.tsx`** (~400 lines)
Benchmark creation form (select providers, models, prompts, iterations).
Results table: columns for provider, model, TTFT, total_latency, tokens_per_sec, status.
Charts: latency distribution bar chart (Recharts), speed comparison.
Connects to `/api/benchmarks/:id/stream` for SSE progress updates.
Progress bar while running.

**`frontend/src/hooks/useSocket.ts`** (~60 lines)
Reusable Socket.io hook with JWT auth, reconnection, typed event listeners.
Emits: `chat:join`, `chat:leave`, `chat:message`, on messages, system events.

**`frontend/src/components/ChatInput.tsx`** (~80 lines)
MUI `TextField` with auto-expand, send button, typing indicator.
Handles Enter to send, Shift+Enter for newline, max length.

**`frontend/src/components/MessageBubble.tsx`** (~100 lines)
Role-based styling: user (right-aligned, cyan), assistant (left-aligned, dark).
Markdown rendering via `react-markdown`, streaming cursor animation.
Copy button for assistant messages.

**`frontend/src/components/ProviderConfig.tsx`** (~120 lines)
Dialog for selecting provider+model for chat sessions.
Dropdown populated from `/api/providers` list, model selector from `/api/providers/:id/models`.

**`frontend/src/api/chat.ts`** (~80 lines)
API client: `createSession`, `listSessions`, `getSession`, `deleteSession`, `sendMessage`, `getMessages`.
Handles SSE streaming with `EventSource`.

**`frontend/src/api/benchmark.ts`** (~60 lines)
API client: `createBenchmark`, `getBenchmarks`, `getBenchmark`, `deleteBenchmark`.
SSE connection for progress stream.

---

# Section 7: Total File Count & Line Estimates

**Backend (12 files, ~1,630 lines):**

| File | LOC |
|---|---|
| `services/providers/types.ts` | ~80 |
| `services/providers/base.ts` | ~60 |
| `services/providers/openai.ts` | ~180 |
| `services/providers/anthropic.ts` | ~180 |
| `services/providers/ollama.ts` | ~140 |
| `services/providers/index.ts` | ~60 |
| `routes/ai-proxy.ts` | ~150 |
| `routes/chat.ts` | ~280 |
| `routes/chat-group.ts` | ~30 |
| `routes/benchmark.ts` | ~180 |
| `services/benchmark/runner.ts` | ~250 |
| `services/benchmark/prompts.ts` | ~40 |

**Frontend (8 files, ~1,350 lines):**

| File | LOC |
|---|---|
| `pages/ChatPage.tsx` | ~450 |
| `pages/BenchmarkPage.tsx` | ~400 |
| `hooks/useSocket.ts` | ~60 |
| `components/ChatInput.tsx` | ~80 |
| `components/MessageBubble.tsx` | ~100 |
| `components/ProviderConfig.tsx` | ~120 |
| `api/chat.ts` | ~80 |
| `api/benchmark.ts` | ~60 |

**Total: 20 new files, ~2,980 lines of code**
**Edit existing: 1 file (`index.ts` wiring, ~50 lines)**

---

# Section 8: API Endpoints Summary

```
POST   /api/ai/chat/completions        — Stream or fetch chat completion
POST   /api/ai/test                    — Test provider connection
GET    /api/chat/sessions              — List user sessions
POST   /api/chat/sessions              — Create session
GET    /api/chat/sessions/:id          — Get session + messages
PATCH  /api/chat/sessions/:id          — Update session
DELETE /api/chat/sessions/:id          — Delete session
GET    /api/chat/sessions/:id/messages — Paginated messages
POST   /api/chat/sessions/:id/messages — Send message + get AI reply
GET    /api/chat-groups                — STUB (Phase 4)
GET    /api/chat-groups/:id            — STUB
POST   /api/chat-groups/:id/join       — STUB
GET    /api/benchmarks                 — List runs
GET    /api/benchmarks/:id             — Get result
POST   /api/benchmarks                 — Create + start benchmark
GET    /api/benchmarks/:id/stream      — SSE progress stream
DELETE /api/benchmarks/:id             — Cancel or delete
```

---

# Section 9: Implementation Order

1. **`services/providers/`** — types, base, openai, index (~280 lines)
2. **`routes/ai-proxy.ts`** (~150 lines) — depends on #1
3. **`routes/chat.ts`** (~280 lines) — depends on #2
4. **Edit `index.ts` wiring** (+50 lines) — depends on #3
5. **Edit Socket.io in `index.ts`** (+40 lines) — depends on #4
6. **Frontend API clients** (`api/chat.ts`, `api/benchmark.ts`) (~140 lines)
7. **Frontend components** (`ChatInput`, `MessageBubble`, `ProviderConfig`) (~300 lines)
8. **Frontend pages** (`ChatPage`, `BenchmarkPage`) (~850 lines)
9. **`services/benchmark/`** — runner, prompts (~290 lines)
10. **`routes/benchmark.ts`** (~180 lines) — depends on #1 + #9
11. **Edit `index.ts` again** for benchmark routing (+10 lines)

**Priority:** Chat (steps 1–8) is critical path. Benchmark (steps 9–11) can happen in parallel once step 1 is done.

---

# Section 10: Testing Plan

**Unit tests:**
- Provider clients: `openai.ts` (mock fetch), `ollama.ts` (mock NDJSON)
- `ai-proxy`: verify passthrough behavior
- chat routes: verify ownership isolation, session title generation

**Integration tests:**
- Full chat flow: create session → send message → verify persistence + socket event
- Benchmark: create → stream progress → verify result stored

**E2E (optional, Phase 7):**
- Test ChatPage UI with Cypress or Playwright

**Manual testing:**
- Connect to `vLLM-Production` provider → chat with Qwen3.6-35B
- Connect to `vm111` provider → chat with llamacpp.gguf
- Run benchmark comparing both providers on 3 prompts
- Verify socket streaming in real-time (console.log + UI)

---

# Section 11: Risks & Notes

- **Streaming requires careful error handling:** partial messages, network drops
- **SQLite has concurrency limits** — streaming writes during chat could cause lock issues
- **Consider connection pooling** if multiple concurrent streaming sessions
- **Socket.io reconnection:** preserve message cursor, don't lose streaming state
- **Benchmark runner should be async/queued** (not blocking Express request)
- **Consider using BullMQ for benchmark jobs** (Phase 5, but needed now for proper async execution)

---

# Section 12: Quick Start Commands

After creating all files:

```bash
# Backend
cd backend && pnpm run build && pnpm run start
# Or in dev:
pnpm run dev

# Frontend
cd frontend && pnpm run dev

# Test chat endpoint
curl -X POST http://localhost:3000/api/chat/sessions \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"title":"Test Chat","providerId":"<provider-uuid>","model":"llama3"}'

# Send message
curl -X POST http://localhost:3000/api/chat/sessions/<session-id>/messages \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello","stream":true}'
```

---

_End of Phase 3 Implementation Plan._
