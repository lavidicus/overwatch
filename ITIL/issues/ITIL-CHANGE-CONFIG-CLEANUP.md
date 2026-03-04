# ITIL-CHANGE-CONFIG-CLEANUP

**Change ID:** ITIL-CHANGE-CONFIG-CLEANUP  
**Created:** 2026-03-03 19:33 UTC  
**Priority:** P3 (Normal)  
**Category:** Change  
**Status:** Implemented

## Change Summary

Cleaned up OpenClaw configuration by removing unnecessary OpenAI dependencies and simplifying Signal group policy settings.

## Before

**OpenAI Dependencies (Removed):**
- `auth.profiles.openai-codex:default` - OAuth authentication profile
- `agents.defaults.model.fallbacks` - `["openai/openai-codex"]` as fallback model
- Unused provider references in config

**Signal Group Config (Simplified):**
```json
"groupPolicy": "open",
"groupAllowFrom": ["+13184141034", "+17023494151"],
"allowFrom": ["+13184141034", "+17023494151"]
```

## After

**Clean Configuration:**
- No OpenAI OAuth profiles
- No fallback models (ollama only)
- Only `olla` provider configured
- Signal group policy simplified to just `"groupPolicy": "open"`

## Changes Made

**File Modified:** `~/.openclaw/openclaw.json`

### Removed Sections:
1. **auth.profiles** - Entire section deleted
2. **agents.defaults.model.fallbacks** - Array emptied to `[]`
3. **channels.signal.groupAllowFrom** - Removed
4. **channels.signal.allowFrom** - Removed

### Retained:
- ✅ ollama provider with qwen3.5:latest
- ✅ Signal groupPolicy set to "open"
- ✅ All other configuration intact

## Rationale

1. **No OpenAI Usage:** System exclusively uses Ollama (qwen3.5:latest), so OpenAI OAuth credentials and fallbacks are unnecessary
2. **Simplified Signal Config:** `"groupPolicy": "open"` is sufficient for group chat functionality
3. **Cleaner Configuration:** Reduces config size and complexity
4. **Security:** Removed unused API key references from config

## Impact Assessment

### Positive Impacts
- ✅ Cleaner, more maintainable config
- ✅ Reduced attack surface (no unused API keys)
- ✅ Faster config parsing
- ✅ No confusion about available providers

### Risks Mitigated
- No negative impacts - all removed items were unused
- System continues to function normally
- No service disruption required

### Affected Systems
- OpenClaw configuration parsing
- Signal group message handling
- Model provider fallback logic

## Verification

**Post-change status:**
- ✅ Gateway running
- ✅ ollama provider active (qwen3.5:latest)
- ✅ Signal group policy: open
- ✅ No config validation errors
- ✅ Session functioning normally

**Verification Commands:**
```bash
# Check config is valid
openclaw gateway status

# Verify no OpenAI references
grep -i "openai" ~/.openclaw/openclaw.json
# Should only show "openai-completions" (API type, not provider)

# Check Signal config
grep -A5 "signal" ~/.openclaw/openclaw.json
```

## Rollback Plan

If issues arise, restore from backup:
1. Re-add `auth.profiles.openai-codex:default` section
2. Add `"fallbacks": ["openai/openai-codex"]` to `agents.defaults.model`
3. Add `groupAllowFrom` and `allowFrom` arrays back

**Note:** Backup file should exist in git history or recent backup.

## Related Changes

- **ITIL-CHANGE-MANAGEMENT-CONTEXT-WINDOW** (2026-03-03): Context window reduction
- **ITIL-ISSUE-GATEWAY-RESTART-AVAILABILITY**: Gateway restart issues
- **vLLM Provider Cleanup** (2026-03-03): Removed vLLM provider

## Approval

**Requested by:** Jeremy  
**Implemented by:** Jeremy (config cleanup)  
**Validated by:** Sam  
**Approved:** 2026-03-03 19:33 UTC

---

**Last Updated:** 2026-03-03 19:33 UTC  
**Tags:** change, configuration, cleanup, signal, ollama