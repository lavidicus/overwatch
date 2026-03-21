# Token Optimization Playbook

---
**Author:** Sam
**Created:** 2026-02-28
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [tokens, optimization, costs, models]
---

## Overview

Actionable steps to reduce token usage and costs while maintaining response quality. Based on SIP token optimization sprint plan.

## Priority

**P2** — Cost and efficiency optimization, not emergency

## Category

**Operations**

## Estimated Duration

- **Total:** ~30-60 minutes
- **Critical path:** ~10 minutes (heartbeat optimization)
- **Notes:** System prompt cleanup may take longer

## Communication

- **Before starting:** No notification needed
- **After completion:** Log token reduction results
- **If blocked:** Verify configs are writable

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Over-optimization reduces quality | Medium | Keep quality checks |
| Misconfigured models | Medium | Validate model routing |
| Cleanup deletes needed logs | Low | Keep backups before cleanup |

## Current Model Configuration

- **Primary Model**: `olla/qwen3.5:latest` (local, free)
- **Fallback**: `openai/openai-codex` (paid, if needed)
- **Heartbeat Interval**: Every 6 hours
- **Heartbeat Prompt**: "Check: Any blockers, opportunities, or progress updates needed?"

## Procedure

### 1) Heartbeat Prompt Optimization

**Current:**
```
Check: Any blockers, opportunities, or progress updates needed?
```

**Optimized:**
```
Report blockers/opportunities. No updates → "No blockers — <time>".
```

**Impact:** Reduces heartbeat tokens by ~60-70% (from ~150 to ~50 tokens avg)

**Implementation:**
```bash
sed -i 's/Check: Any blockers, opportunities, or progress updates needed?/Report blockers\/opportunities. No updates → "No blockers — <time>"./' ~/.openclaw/openclaw.json
```

### 2) Compact Reply Guidelines

**When to be concise:**
- Routine updates (heartbeat, cron jobs)
- Confirmation messages
- Status checks
- Non-critical information

**When to be thorough:**
- Complex problem-solving
- Security-sensitive operations
- User-facing explanations
- Documentation updates

**Implementation:** Add to `TOOLS.md`:
```markdown
### Response Guidelines

- **Routine tasks** (heartbeat, cron): Keep under 50 tokens
- **Status updates**: Bullet points, no prose
- **Complex work**: Full explanation
- **Confirmations**: One sentence + result
```

### 3) System Prompt Hygiene

**Remove unnecessary cruft:**
- Redundant role definitions
- Overly verbose instructions
- Repeated examples

**Audit steps:**
1. Review `IDENTITY.md`, `SOUL.md`, `USER.md`
2. Consolidate overlapping instructions
3. Remove dated references

### 4) Diff/Log Deduplication

**Pattern to avoid:**
```
- File A changed
- File B changed
- File C changed
... (repeated context)
```

**Better approach:**
```
Files changed: A, B, C, D (see commit for full list)
```

**Implementation:** Summarize repeated patterns:
```
Updated 23 files (see git status for full list)
```

### 5) Session History Cleanup

**Automated cleanup:**
- Delete session transcripts older than 7 days
- Keep only summary in `memory/YYYY-MM-DD.md`
- Remove redundant tool call logs

**Script to run:**
```bash
find ~/.openclaw/sessions/ -name "*.json" -mtime +7 -delete
```

## Longer Term Optimizations

### 1) Model Routing

**Strategy:**
- Use local models (`olla/qwen3.5:latest`) for routine tasks
- Only use paid models for complex reasoning or when explicitly requested
- Cache frequent responses locally

**Implementation:**
```json
"agents.defaults.model": {
  "primary": "olla/qwen3.5:latest",
  "fallbacks": [],
  "allow_paid": false
}
```

### 2) Auto-Summarized Context Windows

**Concept:** Instead of sending full session history, send:
- Key decisions made
- Current task state
- Relevant recent context (last 3-5 exchanges)

**Implementation:** Create summarization script that runs before each session start.

### 3) Periodic Cleanup Schedule

**Cron job for cleanup:**
```bash
0 3 * * * find ~/.openclaw/sessions/ -name "*.json" -mtime +7 -delete
```

## Metrics to Track

- **Daily token count** (by model)
- **Cost per day** (if using paid models)
- **Response length** (avg tokens per reply)
- **Heartbeat token usage** (should be <100 tokens)

## Success Criteria

- **Heartbeat messages**: <100 tokens avg
- **Daily token spend**: <10k tokens (if no paid models)
- **Response quality**: No degradation in user satisfaction

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
