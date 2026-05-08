# Context Window Management

**Date:** 2026-05-08
**Source:** ITIL/ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER.md
**Tags:** #context-window #llama-server #token-management #compaction

## Problem Statement
Llama-server on host `olla` was rejecting requests that exceeded 65536 tokens, even though SWA (sliding window attention) with `--context-shift` was enabled and should be rolling the context automatically.

## Root Cause Analysis
The issue was **client-side context accumulation**, not server-side. The llama-server was configured correctly:
```
--ctx-size 65535 --context-shift
```

SWA checkpoints were cycling (1→8) and rotating normally, but the **OpenClaw client was building prompts up to 66k+ tokens before sending them to the server**, exceeding the server's configured context window.

## Evidence from llama-server logs
```
Mar 01 15:18:56 olla llama-server[491974]: srv    send_error: task id = 73000, error: request (65801 tokens) exceeds the available context size (65536 tokens), try increasing it
Mar 01 15:21:38 olla llama-server[491974]: srv    send_error: task id = 73003, error: request (65970 tokens) exceeds the available context size (65536 tokens), try increasing it
Mar 01 15:21:38 olla llama-server[491974]: srv    send_error: task id = 73006, error: request (66139 tokens) exceeds the available context size (65536 tokens), try increasing it
```

## Solution Implemented

### Part 1: Increase server ctx-size ✅
**Status:** Config ready, awaiting deployment

Created updated `/etc/systemd/system/llama-server.service`:
- Changed `--ctx-size 65535` → `--ctx-size 131072`
- Provides 2x buffer for prompt accumulation
- **Action needed:** Deploy to olla host (see `DEPLOY-LLAMA-SERVER.md`)

### Part 2: Add client-side guardrails ✅
**Status:** Complete

Updated `~/.openclaw/openclaw.json`:
- Changed `"reserveTokens": 20000` → `"reserveTokens": 40000`
- Compaction now triggers at ~216k tokens (256k - 40k buffer)
- Provides ~33% buffer before model's context window limit

**Rationale:**
- Model context window: 256,000 tokens
- Server ctx-size (after fix): 131,072 tokens
- Reserve 40k tokens = ~15% buffer before compaction triggers
- This ensures compaction fires well before prompts approach 66k limit

### Part 3: Prompt builder guard (code-level fix) 🚧
**Status:** Requires OpenClaw source modification

**Recommended implementation:**

```typescript
// In OpenClaw's prompt builder (src/agents/system-prompt.ts or similar)
const SERVER_CTX_SIZE = 131072;
const SAFETY_FACTOR = 0.9; // Trigger at 90% of limit
const MAX_PROMPT_SIZE = SERVER_CTX_SIZE * SAFETY_FACTOR; // ~118k tokens

function buildPrompt(messages) {
  const estimatedTokens = estimateTokenCount(messages);
  
  if (estimatedTokens > MAX_PROMPT_SIZE) {
    // Trigger compaction BEFORE sending
    await triggerCompaction();
    // Rebuild with compacted context
  }
  
  return compilePrompt(messages);
}
```

**Location to modify:** OpenClaw source code (not accessible in current session)
**Action:** Submit PR to openclaw/openclaw repository or request maintainer to implement

## Lessons Learned
1. **Always monitor both client and server context limits** - issues can originate from either side
2. **Maintain buffer zones** - 15-33% buffer prevents edge case failures
3. **Document token management** - critical for long-running sessions
4. **Test with realistic token counts** - synthetic tests may not reveal accumulation issues

## Related Files
- `ITIL/ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER.md` - Full issue documentation
- `DEPLOY-LLAMA-SERVER.md` - Deployment instructions
- `~/.openclaw/openclaw.json` - OpenClaw compaction settings

---
*Created: 2026-05-08 | Last updated: 2026-05-08*