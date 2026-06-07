# Phase 5 — Memory & Self-Improvement — Complete

**Date:** 2026-06-06
**Commit:** `a04dd227590d777311f8fde571e69e31f4910a3a`
**Scope:** RAG memory system, vector store integration, self-improvement engine, change management workflow.

---

## Summary

Phase 5 lands a working RAG memory subsystem with hybrid search (TF-IDF cosine + SQLite FTS5 + reranker), automatic memory injection into agent chats, a self-improvement engine that produces change proposals for human review, and the supporting CRUD + workflow APIs and React pages.

No external dependencies were added — the embedder is pure JS so the whole stack still runs against SQLite. Hooks are clearly marked so a future migration to pgvector + a real embedding model is a localized change in `services/memory/embedder.ts` and `services/memory/service.ts`.

---

## Files Changed

### Backend (new)

| File | Purpose |
| --- | --- |
| `backend/src/services/memory/embedder.ts` | TF-IDF tokenizer + sparse vector + per-user IDF cache. Pure JS, no deps. |
| `backend/src/services/memory/templates.ts` | Standard RAG system-prompt template. |
| `backend/src/services/memory/service.ts` | CRUD, hybrid search (cosine + FTS5 + recency/promoted boost), `buildMemoryContext`, rebuild, soft TTL expiration. Creates `memory_embeddings` table + `memory_fts` FTS5 virtual table on startup. Maintains `VectorIndex` rows for provenance. |
| `backend/src/routes/memory.ts` | `GET/POST/PATCH/DELETE /api/memory`, `/categories`, `/search`, `/import`, `/rebuild`, `/:id/promote`. |
| `backend/src/services/improvement/engine.ts` | `analyzeProviders`, `analyzeBenchmarks`, `analyzeConfig`, idempotent proposal writer keyed off a `signature` stored in `change_proposals.source`. |
| `backend/src/routes/improvement.ts` | `POST /api/improvement/analyze`, `GET /api/improvement/health`. Also exports `proposalsRouter` for `/api/change-proposals` CRUD/approve/reject/comment. |

### Backend (modified)

| File | Change |
| --- | --- |
| `backend/src/index.ts` | Wired new routes (`/api/memory`, `/api/improvement`, `/api/change-proposals`) and called `initMemorySubsystem()` at boot. |
| `backend/src/routes/chat.ts` | Both regular `send-message` and `agent-message` endpoints now call `buildMemoryContext()` and inject a system context block. Failures are logged but non-fatal. Agent-message response includes `memory.injected` count. |

### Frontend (new)

| File | Purpose |
| --- | --- |
| `frontend/src/api/memory.ts` | Memory API client. |
| `frontend/src/api/improvement.ts` | Improvement / change-proposals API client. |
| `frontend/src/pages/MemoryPage.tsx` | Browse / search tabs, add / edit / delete / promote, bulk import, rebuild index. |
| `frontend/src/pages/ImprovementPage.tsx` | Dashboard tab (provider health, open proposals, 7-day benchmarks). Proposals tab with approve/reject/reason. |

### Frontend (modified)

| File | Change |
| --- | --- |
| `frontend/src/App.tsx` | Routes added: `/memory`, `/improvement`. |
| `frontend/src/layouts/MainLayout.tsx` | Sidebar items added under System Settings: "Memory (RAG)" and "Self-Improvement". |

---

## API surface added

### Memory
- `GET    /api/memory` — paginated list with optional `category`, `q`
- `GET    /api/memory/categories` — counts per category
- `GET    /api/memory/:id`
- `POST   /api/memory`
- `PATCH  /api/memory/:id`
- `POST   /api/memory/:id/promote`
- `DELETE /api/memory/:id`
- `POST   /api/memory/search` — hybrid vector + FTS5 search
- `POST   /api/memory/import` — bulk import
- `POST   /api/memory/rebuild` — rebuild embeddings for the calling user

### Self-improvement
- `POST   /api/improvement/analyze` (OPERATOR+) — runs all analyzers, writes proposals
- `GET    /api/improvement/health` — providers, open proposal count, recent benchmark count

### Change proposals
- `GET    /api/change-proposals` — list (filter by status/category/priority)
- `GET    /api/change-proposals/:id` — detail with comments + versions
- `POST   /api/change-proposals/:id/approve` (ADMIN)
- `POST   /api/change-proposals/:id/reject` (ADMIN, optional `reason`)
- `POST   /api/change-proposals/:id/comment`

---

## Vector storage strategy

Schema-friendly persistence with future migration in mind:

* `memory_embeddings` (raw SQL table): `(memory_id, user_id, vector JSON, norm, updated_at)`. Lightweight, portable, easy to wipe.
* `memory_fts` (SQLite FTS5 virtual table): keyword channel for the hybrid search reranker. Soft-fails if FTS5 isn't available.
* `vector_indexes` (existing Prisma model): one row per indexed memory tracking `vectorStore = 'tfidf-sqlite'` for provenance — a clean swap point when moving to pgvector.

`buildMemoryContext()` returns both the rendered system-prompt block and the raw hits so the chat route can surface "X memories injected" telemetry to the UI.

---

## Verification

### TypeScript
```
backend $ npx tsc --noEmit   → clean
frontend $ npx tsc --noEmit  → clean
```

### Backend boot (after restart)
```
Overwatch backend running on port 3000
Built-in tools synced
Queue system initialized
Memory subsystem initialized
```

### Memory CRUD + search
Created 4 memories across `USER_PROFILE`, `LONG_TERM`, `AGENT_BEHAVIOR`, `SYSTEM_CONFIG`. Search results (top-1 ordering, real run, scores rounded):

| Query | Expected best | Actual top-1 | semantic / hybrid |
| --- | --- | --- | --- |
| `what GPUs does the vLLM server use` | SYSTEM_CONFIG memory | ✅ SYSTEM_CONFIG | 0.531 / 0.395 |
| `user timezone preferences` | USER_PROFILE memory | ✅ USER_PROFILE | 0.460 / 0.349 |
| `Help me debug a problem in the Overwatch project` | LONG_TERM memory | ✅ LONG_TERM | 0.32 / hybrid score 0.32 |

`accessCount` correctly auto-increments and `accessedAt` updates on every search hit.

`POST /api/memory/:id/promote` flips `isPromoted` and raises `relevanceScore` floor to 0.75 — verified.

### Self-improvement engine
First run (no provider/benchmark issues in dev): `{ providerIssues: 0, benchmarkIssues: 0, configIssues: 3, recommendationsCreated: 3, recommendationsSkipped: 0 }`.

Second run (after creating proposals but no underlying change): `{ created: 0, skipped: 3 }` — confirms idempotency keyed off the `source` signature.

Approval flow: `POST /api/change-proposals/<id>/approve` → status `DRAFT → APPROVED`, `deployedByUserId` set to admin uuid, `deployedAt` populated. Verified.

Reject flow: `POST /api/change-proposals/<id>/reject` with `{ reason: "Not applicable in dev" }` → status `REJECTED`, `rollbackReason` set. Verified.

### RAG injection
Ran `buildMemoryContext(userId, query, 3)` directly against the dev DB for three representative queries (vLLM GPUs, user timezone, Overwatch project debugging). Each query produced 3 hits with the correct top-1 memory and a rendered system-prompt block beginning with the `MEMORY_CONTEXT_HEADER` template. This is the exact payload the chat routes now inject.

The agent-message endpoint also passes a `memory.injected` field back in its response so the UI can surface "X relevant memories loaded" — wired but no UI badge added yet (the count is available to consume on the chat page).

---

## Git

```
$ git log -1 --format='%H %s'
a04dd227590d777311f8fde571e69e31f4910a3a Phase 5: RAG memory + self-improvement engine
```

10 new files, 2 modified backend files, 2 modified frontend files. Total ~1.5 KLOC.

---

## Known limitations / migration notes

* **TF-IDF is per-user**: vocabulary is built from a single user's memories. Cross-user search would need a global IDF or a real embedding model. For a single-user dev environment this is correct and cheap.
* **FTS5 boost is opportunistic**: SQLite FTS5 may return 0 scores for noun-phrase queries; the semantic vector handles the heavy lifting and the FTS5 score is a bonus when it fires.
* **Approval ≠ deploy**: an APPROVED proposal does not auto-mutate settings. Wiring the apply step is a future-phase concern (deliberate human-in-the-loop posture from the spec).
* **No agent UI badge for `memory.injected` yet**: the count flows in the response; surfacing it in `ChatPage` is a small follow-up.
* **Migration path to pgvector**: replace `embed()` in `services/memory/embedder.ts` with a vLLM `/v1/embeddings` call, swap `memory_embeddings.vector TEXT` for a `vector(N)` column, and update `searchMemories()` to use SQL-side cosine. The `VectorIndex.vectorStore` field exists to track this swap per memory.
