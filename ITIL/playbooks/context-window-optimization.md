# ITIL Playbook: Context Window Optimization

---
**Author:** Sam (ops butler AI)  
**Created:** 2026-03-10  
**Last Updated:** 2026-03-10  
**Version:** 1.0  
**Tags:** [context-window, openclaw, compaction, ollama, performance]  
---

## Overview

This playbook provides procedures for optimizing OpenClaw context window management to prevent overflow errors and ensure proper compaction timing. Covers configuration of `reserveTokens` parameter and monitoring context growth.

## Priority

**P2 (High)** — Affects session reliability and prevents catastrophic context overflow

- **P1** — Session failure due to context overflow
- **P2** — Configuration optimization to prevent overflow
- **P3** — Routine tuning and monitoring

## Category

**Change Management** — Configuration modification with immediate effect

## Estimated Duration

- **Total:** ~5 minutes
- **Critical path:** ~3 minutes (steps 1-3)
- **Notes:** No service restart required

## Communication

- **Before starting:** N/A (low-risk change)
- **After completion:** Update MEMORY.md and CMDB
- **If blocked >5 min:** Escalate to Jeremy

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Config syntax error | Session fails to start | JSON validation before apply; git backup |
| Wrong value | Compaction triggers too early/late | Use documented safe values; monitor |
| No effect | Config not applied | Verify with status commands |

## Prerequisites

- OpenClaw installed and running
- Access to `~/.openclaw/openclaw.json`
- Git repository for rollback capability
- Model context window size known (262k for qwen3.5:latest)

## Status Checks

```bash
# Check current reserveTokens value
cat ~/.openclaw/openclaw.json | grep -A2 reserveTokens

# Check current context usage
openclaw status | grep Context

# Verify model context window
curl -s http://172.16.254.100:11434/api/tags | jq '.data[0].details.parameter_size'
```

## Procedure

### Step 1: Document Current State

Before making changes, capture the current configuration.

```bash
# Create backup
cp ~/.openclaw/openclaw.json ~/.openclaw/openclaw.json.backup.$(date +%Y%m%d-%H%M%S)

# Record current value
CURRENT_VALUE=$(cat ~/.openclaw/openclaw.json | grep -A1 reserveTokens | grep reserveTokens | grep -oP '\d+')
echo "Current reserveTokens: $CURRENT_VALUE"
```

**Expected output:**
```
Current reserveTokens: 20000
```

### Step 2: Calculate Optimal ReserveTokens

Determine the appropriate reserveTokens value based on your model's context window.

**Formula:**
```
reserveTokens = ModelContextWindow × 0.15
```

**For qwen3.5:latest (262k context):**
```
reserveTokens = 262000 × 0.15 = 39,300 → Round to 40,000
```

**Rationale:**
- 15% buffer ensures compaction triggers at ~85% of context limit
- Provides safety margin for prompt accumulation spikes
- Aligns with documented safe values

### Step 3: Apply Configuration Change

Update the `reserveTokens` parameter in `openclaw.json`.

```bash
# Edit the file using your preferred editor
nano ~/.openclaw/openclaw.json
```

**Find and update:**
```json
"compaction": {
  "mode": "safeguard",
  "reserveTokens": 20000,  # ← Change this
```

**To:**
```json
"compaction": {
  "mode": "safeguard",
  "reserveTokens": 40000,  # ← New value
```

**Save and exit.**

### Step 4: Validate Configuration

Verify the change was applied correctly.

```bash
# Check the file is valid JSON
python3 -c "import json; json.load(open('~/.openclaw/openclaw.json'))" && echo "✓ JSON valid"

# Verify the new value
cat ~/.openclaw/openclaw.json | grep -A1 reserveTokens
```

**Expected output:**
```
✓ JSON valid
        "reserveTokens": 40000,
```

### Step 5: Monitor Context Growth

After applying the change, monitor context usage to ensure compaction triggers at the expected point.

```bash
# Check current status
openclaw status | grep -E "Context|Compactions"

# Wait for next conversation turn, then check again
# Context should show compaction activity if approaching limit
```

**Expected behavior:**
- Compaction triggers at ~216k tokens (262k - 40k buffer)
- Context percentage drops after compaction
- No overflow errors

## Verification

### Immediate Verification

```bash
# 1. Verify configuration
cat ~/.openclaw/openclaw.json | grep reserveTokens
# Expected: 40000

# 2. Check JSON validity
python3 -c "import json; json.load(open('~/.openclaw/openclaw.json'))" && echo "✓ Valid"

# 3. Check current context status
openclaw status | grep Context
# Expected: Context: 0/262k (0%)
```

### Long-term Verification

Monitor over 24-48 hours:

```bash
# Check for context overflow errors in logs
tail -100 ~/.openclaw/openclaw-*.log | grep -i "exceeds\|overflow\|context"

# Check compaction activity
grep "compaction" ~/.openclaw/openclaw-*.log
```

**Success criteria:**
- No overflow errors
- Compaction triggers at expected threshold
- Context usage stays within safe limits

## Common Issues

### Issue: JSON Syntax Error

**Symptoms:**
- OpenClaw fails to start
- Error: "Invalid JSON in openclaw.json"

**Diagnosis:**
```bash
python3 -c "import json; json.load(open('~/.openclaw/openclaw.json'))"
```

**Resolution:**
1. Restore from backup: `cp ~/.openclaw/openclaw.json.backup.* ~/.openclaw/openclaw.json`
2. Use proper JSON editor (VS Code, nano with syntax highlighting)
3. Validate with `python3 -m json.tool` before applying

### Issue: Compaction Not Triggering

**Symptoms:**
- Context approaching 256k without compaction
- No compaction logs in openclaw-*.log

**Diagnosis:**
```bash
# Check current config
cat ~/.openclaw/openclaw.json | grep -A5 compaction

# Check session status
openclaw status | grep Context
```

**Resolution:**
1. Verify `reserveTokens` is set correctly
2. Check model context window matches configuration
3. Restart OpenClaw gateway if changes not applied

### Issue: Compaction Too Aggressive

**Symptoms:**
- Compaction triggers well before expected threshold
- Lost context before reaching safe limit

**Diagnosis:**
```bash
# Check if reserveTokens is too high
cat ~/.openclaw/openclaw.json | grep reserveTokens
# Expected: ~40000 for 262k model
```

**Resolution:**
1. Adjust `reserveTokens` downward (e.g., 30000 instead of 40000)
2. Monitor to find optimal balance

## Rollback

If the change causes issues, revert to previous value:

```bash
# Find latest backup
ls -lt ~/.openclaw/openclaw.json.backup.* | head -1 | awk '{print $NF}'

# Restore from backup
cp ~/.openclaw/openclaw.json.backup.YYYYMMDD-HHMMSS ~/.openclaw/openclaw.json

# Or use git
cd ~/.openclaw
git checkout HEAD~1 openclaw.json
```

## Related Playbooks

- [[llama-server-failures.md]] — Llama server troubleshooting
- [[openclaw-gateway-failures.md]] — Gateway troubleshooting
- [[token-optimization.md]] — Token optimization strategies

## Related Documentation

- **ITIL Issue:** [ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER.md](/home/localadmin/.openclaw/workspace/ITIL/ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER.md)
- **CMDB Change:** [change-2026-03-10-context-window-reserve.md](/home/localadmin/.openclaw/workspace/ITIL/cmdb/change-2026-03-10-context-window-reserve.md)
- **PKB Guide:** [PKB-GUIDE-CONTEXT-WINDOW.md](/home/localadmin/.openclaw/workspace/pkb/resources/Concepts/PKB-GUIDE-CONTEXT-WINDOW.md)

## Notes

- **No service restart required** — Configuration applied on next session
- **Safe to apply** — Low-risk configuration change
- **Monitor for 24h** — Verify compaction behavior after change
- **Document in MEMORY.md** — Always document configuration changes

---
**Change ID:** CR-2026-03-10-CW-001  
**Implemented:** 2026-03-10 03:51 UTC
