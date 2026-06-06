# Multi-Agent Group Chat / Consensus — Implementation Report

**Date:** 2026-06-06
**Commit:** `41a58c3c388fd2ed837e012d796fb8a1b06aaa20`
**Branch:** main

## Summary

Built a new "AI Panel" feature for Overwatch where the user defines a group of
AI advisors (facilitator / analyst / critic / advisor), asks them a topic,
and the backend runs a round-robin discussion where each advisor sees the
others' prior turns. After each round an LLM judge decides whether consensus
was reached. The loop terminates on consensus or `maxRounds` (default 5).

Existing single-agent and tool-agent chat flows are untouched.

## Files changed

### Backend (`backend/`)

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | New `AgentParticipant`, `ConsensusRound`, `ConsensusMessage` models. `ChatGroup` gains `maxRounds`, `judgeProviderId`, `judgeModelId`. `ChatSession` gains `isGroupChat`, `groupId` + `group` relation. |
| `src/routes/group-chat.ts` | REST API: list/create/get/update/delete groups, run consensus, get history, list available agent models. Audited via existing `auditLog` middleware. |
| `src/services/consensus/orchestrator.ts` | Core multi-agent loop. Builds per-agent prompt (system role + topic + prior rounds + current-round transcript), calls the provider client, persists each turn, then calls the judge LLM with strict-JSON output. Emits Socket.io events for live UI updates. |
| `src/routes/chat.ts` | `POST /sessions` and `GET /sessions(/:id)` understand `isGroupChat`/`groupId` so a chat session can be optionally linked to a panel. |
| `src/index.ts` | Mounts the new router under `/api/chat`. Adds `group:join` / `group:leave` socket handlers (room `group:<id>`). |

### Frontend (`frontend/`)

| File | Purpose |
|---|---|
| `src/api/group-chat.ts` | Typed client for all `/api/chat/groups*` endpoints. |
| `src/components/CreateGroupDialog.tsx` | Modal to build a new panel: name, max rounds, advisors picked from available `ProviderModel`s with role + optional custom system prompt. |
| `src/pages/GroupChatPage.tsx` | Dedicated `/panels` page. Sidebar of saved panels, header with per-advisor avatars (stable color hash), live round card that fills in as agents reply via Socket.io, persisted round cards with collapsible transcripts, prominent consensus result `Alert`. |
| `src/App.tsx`, `src/layouts/MainLayout.tsx` | Wire up `/panels` route and "AI Panels" sidebar entry. |

## API surface

```
GET    /api/chat/groups                         # list user's panels
POST   /api/chat/groups                         # create panel (+ agents)
GET    /api/chat/groups/:id                     # group + agents + lastRound
PATCH  /api/chat/groups/:id                     # update; agents[] replaces roster
DELETE /api/chat/groups/:id
POST   /api/chat/groups/:id/consensus           # { topic, sessionId?, maxRounds? }
GET    /api/chat/groups/:id/history             # all rounds + messages
GET    /api/chat/groups/agents/available        # ProviderModel pool
```

## Socket.io events

```
client → server: group:join <groupId>, group:leave <groupId>
server → client (room group:<id>):
  group:consensus:start { groupId, topic, agents, maxRounds }
  group:round:start     { groupId, roundId, roundNumber }
  group:round:agent:start    { groupId, roundId, agentName, role, position }
  group:round:agent:complete { groupId, roundId, agentName, message, error? }
  group:round:complete  { groupId, roundId, reachedConsensus, judgeAnalysis, finalConsensus }
  group:consensus:complete   { groupId, status, finalConsensus, totalRounds }
```

## Orchestrator design notes

- **Per-agent prompt**: system message = role base prompt (or user-supplied
  override) + "you are <name>, role <role>, do not impersonate others". The
  user message contains the topic, a transcript of all *prior* rounds, and a
  live transcript of the *current* round up to this agent.
- **Judge**: a separate LLM call after each round. Defaults to the first
  agent's provider/model; can be overridden by `ChatGroup.judgeProviderId/judgeModelId`.
  Forced to emit strict JSON (`{consensus, summary, rationale}`), with a
  heuristic fallback parser if the model deviates.
- **Round status values**: `IN_PROGRESS` while a round is running, `REACHED_CONSENSUS`
  when the judge agrees, `NO_CONSENSUS` for intermediate rounds that didn't
  agree (and the next round was started), `FAILED` for the last round of a
  run that exhausted `maxRounds`.
- **Session integration**: when a `sessionId` is provided, the user's topic is
  inserted as a `USER` message and the final summary (or "no consensus" note)
  is inserted as an `ASSISTANT` message so the chat log mirrors the panel run.
- **Failure isolation**: a single agent error becomes a `(error: …)` turn but
  does not abort the round. Judge failures are non-fatal — the round simply
  proceeds without a verdict (treated as no consensus).

## Verification

Backend on `:3000`, frontend on `:5713`. Token generated via the supplied JWT helper.

1. **Available agents lookup** (`GET /api/chat/groups/agents/available`) returned
   2 ready provider models (`vm111`/Qwen3.6 27B llama.cpp and `vLLM-Production`/
   Qwen3.6-35B-A3B vLLM). ✅
2. **Group creation** (`POST /api/chat/groups`): created `Verification Panel`
   `25a18eb1-1e49-4d28-ae67-53af0aa169b3` with 3 advisors in 3 distinct roles
   (facilitator / analyst / critic), persisted with stable positions. ✅
3. **Consensus run** (`POST /api/chat/groups/:id/consensus`) with topic
   _"should we say YES to coffee in the afternoon?"_ and `maxRounds=1`:
   - All three advisors responded **in order** (Claude-Like → Qwen-Analyst →
     Qwen-Critic).
   - The critic's response **explicitly referenced** the prior YES/NO debate
     ("the binary 'NO' overlooks the critical variable of individual
     tolerance…") — proving inter-agent context plumbing works.
   - Judge correctly produced `consensus=false` with rationale citing the
     contradiction between strict-NO and conditional-YES positions.
   - Round persisted with status `FAILED` (maxRounds hit). ✅
4. **Multi-round run** with `maxRounds=2`: orchestrator ran 2 rounds, judge
   evaluated each, intermediate round persisted as `NO_CONSENSUS`, last as
   `FAILED`. Total persisted rounds = 3 (1 + 2). ✅
5. **History endpoint** (`GET /api/chat/groups/:id/history`) returned all
   rounds, each with their 3 messages in `position` order. ✅
6. **Session linkage** (`POST /api/chat/sessions { groupId }`): created a
   session with `isGroupChat=true` and the right `groupId`, no provider
   required. Existing non-group sessions continue to surface `isGroupChat=false`. ✅
7. **TypeScript clean**:
   - Backend: `npx tsc --noEmit` → 0 errors.
   - Frontend: `npx tsc --noEmit` → 0 errors. ✅
8. **Regression**: existing chat sessions still list correctly via
   `GET /api/chat/sessions`. ✅

### Sample real-LLM transcript (excerpt)

```
Claude-Like (facilitator): To answer directly: NO, unless you are an
  exceptional metabolizer or it is very early afternoon. Caffeine has a
  half-life of 5-6 hours…

Qwen-Analyst (analyst): NO, because caffeine's 5-6 hour half-life means
  afternoon consumption significantly fragments deep sleep…

Qwen-Critic (critic): While the physiological risks of afternoon
  caffeine are well-documented, the binary "NO" overlooks the critical
  variable of individual tolerance…

Judge: No consensus: Two advisors advocate for a strict 'NO' based on
  sleep hygiene, while one advisor argues for context-dependent 'YES'…
```

## Edge cases & constraints handled

- Agents with no `providerId` or no resolvable model name → 500 with a clear
  error before any LLM call.
- Provider/model name resolution falls back to `provider.model` when no
  `ProviderModel` is attached, matching existing `/sessions` behaviour.
- `PATCH /groups/:id` with an `agents[]` array replaces the roster
  atomically inside a transaction (and reassigns `position` from the new array
  order so the round order remains stable).
- `agentName` is unique per group (`@@unique([groupId, agentName])`); the UI
  guards against duplicates client-side too.
- Socket.io emit is wrapped in try/catch so a transport hiccup never breaks
  the orchestrator loop.
- The orchestrator does **not** call the routing engine — group runs use the
  explicit per-agent provider/model so the panel composition is deterministic.

## Limitations / TODOs (not in scope)

- The judge prompt is fairly opinionated; small models may refuse strict-JSON
  and trigger the heuristic fallback. Tightening the schema (and/or wiring the
  routing engine for a "strict-format" model) is a follow-up.
- The frontend does not yet expose the group selector inside `ChatPage` for
  existing group-linked sessions; that lives on the dedicated `/panels` page
  and via direct API. Hooking it into the main chat composer for sessions with
  `isGroupChat=true` is a small follow-up if needed.
- `ChatGroupMember` is auto-populated with the owner as `OWNER`; human-style
  multi-user group chats remain unchanged and out of scope.

## How to use

1. **Add models** via Providers/Models page so they show as `AVAILABLE`.
2. Go to **/panels** in the sidebar.
3. Click **+** → name the panel, set max rounds (1-10), add 1-8 advisors,
   pick a model and a role for each.
4. Ask the panel a question; live transcript fills in as each advisor speaks;
   when consensus is reached you'll see a green "Consensus reached" card with
   the synthesized answer.
