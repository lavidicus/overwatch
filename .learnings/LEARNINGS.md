# Learnings

Corrections, insights, and knowledge gaps captured during development.

**Categories**: correction | insight | knowledge_gap | best_practice
**Areas**: frontend | backend | infra | tests | docs | config
**Statuses**: pending | in_progress | resolved | wont_fix | promoted | promoted_to_skill

## Status Definitions

| Status | Meaning |
|--------|---------|
| `pending` | Not yet addressed |
| `in_progress` | Actively being worked on |
| `resolved` | Issue fixed or knowledge integrated |
| `wont_fix` | Decided not to address (reason in Resolution) |
| `promoted` | Elevated to CLAUDE.md, AGENTS.md, or copilot-instructions.md |
| `promoted_to_skill` | Extracted as a reusable skill |

## Skill Extraction Fields

When a learning is promoted to a skill, add these fields:

```markdown
**Status**: promoted_to_skill
**Skill-Path**: skills/skill-name
```

Example:
```markdown
## [LRN-20250115-001] best_practice

**Logged**: 2025-01-15T10:00:00Z
**Priority**: high
**Status**: promoted_to_skill
**Skill-Path**: skills/docker-m1-fixes
**Area**: infra

### Summary
Docker build fails on Apple Silicon due to platform mismatch
...
```

---


## [LRN-20260226-001] best_practice

**Logged**: 2026-02-26T19:10:00Z
**Priority**: medium
**Status**: resolved
**Area**: config

### Summary
Heartbeat replies delivered to Signal disappear if the message is only `HEARTBEAT_OK`, because the gateway treats that token as an ACK and drops delivery.

### Details
While testing the Signal heartbeat pipeline the gateway logs showed successful delivery even though no message appeared in Signal. Root cause: the heartbeat model responded with only `HEARTBEAT_OK`, triggering OpenClaw's heartbeat-ack filter which strips and discards the reply when no additional text remains. This makes heartbeat diagnostics invisible on Signal.

### Suggested Action
Ensure heartbeat prompts force human-readable summaries instead of the ACK token. Update `openclaw.json` and `HEARTBEAT.md` so idle runs reply with a short text (e.g., `No blockers — <UTC time>`).

### Metadata
- Source: conversation
- Related Files: openclaw.json, HEARTBEAT.md
- Tags: heartbeat, signal, delivery, ops
- See Also: none
- Pattern-Key: comms.heartbeat.ack_filter
- Recurrence-Count: 1
- First-Seen: 2026-02-26
- Last-Seen: 2026-02-26

### Resolution
- **Resolved**: 2026-02-26T19:15:00Z
- **Commit/PR**: 2ca01e7 (heartbeat prompt tightening)
- **Notes**: Prompt + checklist now force textual summaries so Signal receives the message.

---
