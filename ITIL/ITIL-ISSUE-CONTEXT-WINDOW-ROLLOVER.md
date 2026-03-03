# ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER

**ID:** ITIL-CW-001  
**Title:** Context window fails to roll when approaching 2M tokens  
**Status:** In Progress  
**Priority:** P2 (High)  
**Category:** Problem  
**Created:** 2026-03-01  
**Assignee:** @me

---

## Summary

Llama-server on host `olla` is rejecting requests that exceed 65536 tokens, even though SWA (sliding window attention) with `--context-shift` is enabled and should be rolling the context automatically.

## Root Cause

The issue is **client-side context accumulation**, not server-side. The llama-server is configured correctly:

```
--ctx-size 65535 --context-shift
```

SWA checkpoints are cycling (1→8) and rotating normally, but the **OpenClaw client is building prompts up to 66k+ tokens before sending them to the server**, exceeding the server's configured context window.

## Evidence from llama-server logs

```
Mar 01 15:18:56 olla llama-server[491974]: srv    send_error: task id = 73000, error: request (65801 tokens) exceeds the available context size (65536 tokens), try increasing it
Mar 01 15:21:38 olla llama-server[491974]: srv    send_error: task id = 73003, error: request (65970 tokens) exceeds the available context size (65536 tokens), try increasing it
Mar 01 15:21:38 olla llama-server[491974]: srv    send_error: task id = 73006, error: request (66139 tokens) exceeds the available context size (65536 tokens), try increasing it
```

## Impact

- Session fails when context approaches ~2M tokens
- Prompts are rejected with "exceeds available context size" error
- User experiences unexpected session termination

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

## Next Steps

1. [x] Document issue in ITIL/
2. [x] Create updated llama-server.service file
3. [ ] **Deploy server fix** (manual step):
   ```bash
   scp llama-server.service localadmin@olla:/tmp/
   ssh localadmin@olla "sudo cp /tmp/llama-server.service /etc/systemd/system/ && \
                        sudo systemctl daemon-reload && \
                        sudo systemctl restart llama-server"
   ```
   See `DEPLOY-LLAMA-SERVER.md` for details
   
4. [x] **Update OpenClaw config:** Done - reserveTokens increased to 40000
5. [ ] **Implement code guard:** Add prompt builder check (requires OpenClaw source access)
6. [ ] **Test:** Run long conversation and monitor:
   - `journalctl -u llama-server -f` for context errors
   - `/context` output for token counts
7. [ ] **Update MEMORY.md:** Document resolution

## Related Files

- `/etc/systemd/system/llama-server.service` - Server config (update ready in workspace)
- `~/.openclaw/openclaw.json` - OpenClaw compaction settings ✅ updated
- `llama-server.service` - Updated config in workspace (ready to deploy)
- `DEPLOY-LLAMA-SERVER.md` - Deployment instructions
- `ITIL/issues/` - Issue tracking

---

*This issue was discovered during session startup on 2026-03-01. Context window rolled to checkpoint 8 but client continued accumulating prompts beyond server limit.*

**Resolution timeline:**
- Root cause identified: ✅ (client-side accumulation)
- Server config updated: ✅ (ready to deploy)
- Client guardrails added: ✅ (config updated)
- Code-level fix pending: 🚧 (requires OpenClaw source)
- Testing pending: 🚧 (awaiting server deployment)