# PKB Guide: Context Window Configuration

**Last Updated:** 2026-03-10  
**Version:** 1.0  
**Tags:** [openclaw, context-window, compaction, ollama, token-management]

---

## Overview

This guide explains how to configure OpenClaw's context window management to prevent overflow errors and optimize memory usage. Focuses on the `reserveTokens` parameter that controls when context compaction triggers.

**When to use:** When experiencing context overflow, tuning compaction behavior, or setting up new OpenClaw deployments.

## When to Use

- Context overflow errors occurring
- Compaction triggering too early or too late
- Setting up new OpenClaw instance
- Troubleshooting session failures
- Optimizing token efficiency

## Prerequisites

- OpenClaw installed and running
- Access to `~/.openclaw/openclaw.json`
- Knowledge of model context window size
- Git repository for version control

## Quick Summary

```bash
# Calculate optimal reserveTokens (15% of context window)
reserveTokens = ContextWindow × 0.15

# For 262k context model:
# reserveTokens = 262000 × 0.15 = 39,300 → Use 40,000

# Apply configuration
nano ~/.openclaw/openclaw.json
# Update: "reserveTokens": 40000
```

## Understanding Context Windows

### How Context Works

1. **Model Context Window:** Maximum tokens the model can handle (e.g., 262k for qwen3.5:latest)
2. **Server Context Size:** llama-server configured limit (e.g., 262k)
3. **Reserve Tokens:** Buffer before compaction triggers
4. **Compaction Threshold:** ContextWindow - ReserveTokens

### Token Flow

```
[Full Context: 262k]
├── [Used: 216k] ← Compaction triggers here (262k - 40k reserve)
├── [Buffer: 40k] ← Reserve tokens (safe zone)
└── [Available: 46k] ← Headroom for new prompts
```

### Why ReserveTokens Matters

**Too Low (< 20k):**
- Compaction triggers too late
- Risk of overflow before compaction fires
- Session failures at ~240k+ tokens

**Too High (> 50k):**
- Compaction triggers too early
- Premature context loss
- Reduced effective context window

**Optimal (~40k for 262k model):**
- 15% buffer ensures safety margin
- Compaction at ~85% capacity
- Balances retention and safety

## Configuration

### Current Configuration (2026-03-10)

```json
{
  "compaction": {
    "mode": "safeguard",
    "reserveTokens": 40000,
    "memoryFlush": {
      "enabled": true,
      "softThresholdTokens": 21072
    }
  }
}
```

### How to Update

1. **Edit configuration:**
   ```bash
   nano ~/.openclaw/openclaw.json
   ```

2. **Find compaction section:**
   ```json
   "compaction": {
     "mode": "safeguard",
     "reserveTokens": 20000,  # ← Change this
   ```

3. **Update value:**
   ```json
   "compaction": {
     "mode": "safeguard",
     "reserveTokens": 40000,  # ← New value
   ```

4. **Validate JSON:**
   ```bash
   python3 -c "import json; json.load(open('~/.openclaw/openclaw.json'))" && echo "✓ Valid"
   ```

5. **Commit changes:**
   ```bash
   cd ~/.openclaw
   git add openclaw.json
   git commit -m "Update reserveTokens to 40000"
   ```

## Calculating Optimal Values

### Formula

```
reserveTokens = ModelContextWindow × TargetPercentage
```

**Recommended:** 15% target

### Examples

| Model | Context Window | ReserveTokens (15%) | Compaction At |
|-------|---------------|---------------------|---------------|
| qwen3.5:latest | 262k | 40k | 222k |
| llama-3-70b | 8k | 1.2k | 6.8k |
| mistral-7b | 32k | 4.8k | 27.2k |

### Considerations

**Increase reserveTokens if:**
- Frequent overflow errors
- Long conversation sessions
- High prompt variability

**Decrease reserveTokens if:**
- Compaction too aggressive
- Losing too much context
- Sessions are short

## Monitoring

### Check Current Status

```bash
# View context usage
openclaw status | grep Context
# Output: Context: 45k/262k (17%)

# Check compaction activity
grep "compaction" ~/.openclaw/openclaw-2026-*.log | tail -5
```

### Expected Behavior

**Normal operation:**
- Context grows gradually
- Compaction triggers at ~216k tokens
- Context drops after compaction
- No overflow errors

**Warning signs:**
- Context > 240k without compaction
- Frequent "exceeds context size" errors
- Session failures

## Troubleshooting

### Issue: Overflow Errors

**Symptoms:**
```
error: request (65801 tokens) exceeds the available context size (65536 tokens)
```

**Diagnosis:**
```bash
# Check reserveTokens
cat ~/.openclaw/openclaw.json | grep reserveTokens

# Check context growth pattern
grep "Context:" ~/.openclaw/openclaw-2026-*.log | tail -20
```

**Resolution:**
1. Increase reserveTokens by 10k
2. Monitor compaction triggers
3. Adjust as needed

### Issue: Compaction Too Early

**Symptoms:**
- Context drops at 150k instead of 216k
- Losing conversation history

**Diagnosis:**
```bash
# Check if reserveTokens is too high
cat ~/.openclaw/openclaw.json | grep reserveTokens
# If > 50k, consider reducing
```

**Resolution:**
1. Reduce reserveTokens by 10k
2. Test with new conversation
3. Adjust until compaction at desired point

### Issue: JSON Syntax Error

**Symptoms:**
```
Error: Invalid JSON in openclaw.json
```

**Diagnosis:**
```bash
python3 -m json.tool ~/.openclaw/openclaw.json
```

**Resolution:**
1. Restore from backup:
   ```bash
   cp ~/.openclaw/openclaw.json.backup.* ~/.openclaw/openclaw.json
   ```
2. Edit with proper editor
3. Validate before applying

## Best Practices

### 1. Version Control

Always use git for configuration changes:
```bash
cd ~/.openclaw
git add openclaw.json
git commit -m "Update reserveTokens from 20000 to 40000"
git push origin main
```

### 2. Document Changes

Update MEMORY.md with significant configuration changes:
```markdown
## Context Window Configuration (2026-03-10)

- **reserveTokens:** 20000 → 40000
- **Rationale:** 15% buffer for 262k context model
- **Compaction triggers at:** ~216k tokens
- **Status:** ✅ Verified working
```

### 3. Monitor After Changes

After any configuration change:
- Monitor context growth for 24h
- Check for overflow errors
- Verify compaction timing
- Adjust if needed

### 4. Use Safe Values

Default recommended values:
- **262k model:** 40k reserve (15%)
- **8k model:** 1.2k reserve (15%)
- **32k model:** 4.8k reserve (15%)

## Related Concepts

### Context Compaction

**What it is:** Process of summarizing old conversation history to free up tokens.

**When it triggers:** When context reaches (ContextWindow - ReserveTokens)

**What it does:**
- Summarizes early conversation
- Writes important context to memory files
- Frees up tokens for new prompts

### SWA (Sliding Window Attention)

**What it is:** llama-server feature that maintains a fixed context window while processing new tokens.

**How it works:**
- When context exceeds limit, oldest tokens are discarded
- Combined with compaction for better memory management

### Memory Flush

**What it is:** Automatic saving of important context to memory files before compaction.

**Triggered at:** `softThresholdTokens` (default: 21k tokens before compaction)

**Writes to:**
- `memory/YYYY-MM-DD.md` - Daily logs
- `MEMORY.md` - Long-term memory
- Git-notes memory - Structured decisions

## References

- **ITIL Issue:** [ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER.md](/home/localadmin/.openclaw/workspace/ITIL/ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER.md)
- **ITIL Playbook:** [context-window-optimization.md](/home/localadmin/.openclaw/workspace/ITIL/playbooks/context-window-optimization.md)
- **CMDB Change:** [change-2026-03-10-context-window-reserve.md](/home/localadmin/.openclaw/workspace/ITIL/cmdb/change-2026-03-10-context-window-reserve.md)
- **OpenClaw Docs:** https://docs.openclaw.ai

---

**Created:** 2026-03-10  
**Last Updated:** 2026-03-10  
**Author:** Sam (ops butler AI)
