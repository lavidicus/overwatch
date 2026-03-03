# ITIL-CHANGE-MANAGEMENT-CONTEXT-WINDOW

**Change ID:** ITIL-CHANGE-MANAGEMENT-CONTEXT-WINDOW  
**Created:** 2026-03-03 15:13 UTC  
**Priority:** P3 (Normal)  
**Category:** Change  
**Status:** Implemented

## Change Summary

Reduced OpenClaw context window size from 256,000 tokens to 131,072 tokens to align with llama-server configuration on olla host.

## Background

The context window was previously configured at 256,000 tokens, but the llama-server on the olla host is configured with `--ctx-size 131072` (deployed during the Context Window Roll-Over Fix on 2026-03-01).

This misalignment meant the actual context window was capped at 131k tokens regardless of the 256k configuration, potentially causing:
- Confusion about available context space
- Ineffective compaction thresholds
- Wasted configuration resources

## Change Details

### Before
- **Configuration:** `openclaw.json` → `models.providers.olla.models[0].contextWindow: 256000`
- **Actual limit:** 131,072 tokens (llama-server constraint)
- **Compaction trigger:** ~216k tokens (reserveTokens: 40k from 256k)

### After
- **Configuration:** `openclaw.json` → `models.providers.olla.models[0].contextWindow: 131072`
- **Actual limit:** 131,072 tokens (aligned)
- **Compaction trigger:** ~91k tokens (reserveTokens: 40k from 131k)

## Implementation

**Date:** 2026-03-03 15:13 UTC  
**Action:** Updated `~/.openclaw/openclaw.json` context window setting  
**Verification:** Gateway restart performed, session refreshed

**File Modified:**
- `~/.openclaw/openclaw.json` → `models.providers.olla.models[0].contextWindow`

**Verification Commands:**
```bash
# Check config
grep -A2 "contextWindow" ~/.openclaw/openclaw.json

# Verify session status
session_status
# Should show: Context: Xk/131k (YY%)
```

## Impact Assessment

### Positive Impacts
- ✅ Configuration matches actual system limits
- ✅ Compaction thresholds now accurate
- ✅ Reduced token budget confusion
- ✅ Better resource planning

### Risks Mitigated
- No negative impacts - this is a configuration correction
- Session reset required (accomplished via gateway restart)
- No data loss - compaction will still occur at appropriate threshold

### Affected Systems
- OpenClaw agent context window management
- Context compaction behavior
- Memory flush triggers

## Rollback Plan

If issues arise, rollback by:
1. Edit `~/.openclaw/openclaw.json`
2. Change `contextWindow: 131072` → `contextWindow: 256000`
3. Restart gateway: `systemctl --user restart openclaw-gateway`

**Note:** This would not restore 256k actual capacity - llama-server is still capped at 131k.

## Verification

**Post-change status:**
- ✅ Gateway running (PID 101319 → new PID after restart)
- ✅ Context window showing 131k (confirmed via session_status)
- ✅ Compaction threshold recalculated
- ✅ No vLLM warnings (from previous cleanup)

## Related Changes

- **ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER** (2026-03-01): Server-side fix for ctx-size
- **ITIL-ISSUE-GATEWAY-RESTART-AVAILABILITY**: Gateway restart issues (documented separately)

## Approval

**Requested by:** Jeremy  
**Implemented by:** Sam  
**Approved:** 2026-03-03 15:13 UTC

---

**Last Updated:** 2026-03-03 15:13 UTC  
**Tags:** change, context-window, configuration, ollama, llama-server