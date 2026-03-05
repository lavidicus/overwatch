# Error Log

Log command failures, exceptions, and unexpected behaviors.

## Format

## [ERR-YYYYMMDD-XXX] skill_or_command_name

**Logged**: ISO-8601 timestamp
**Priority**: high
**Status**: pending | in_progress | resolved | wont_fix
**Area**: frontend | backend | infra | tests | docs | config

### Summary
Brief description of what failed

### Error
```
Actual error message or output
```

### Context
- Command/operation attempted
- Input or parameters used
- Environment details if relevant

### Suggested Fix
If identifiable, what might resolve this

### Metadata
- Reproducible: yes | no | unknown
- Related Files: path/to/file.ext
- See Also: ERR-20250110-001 (if recurring)

### Resolution (if resolved)
- **Resolved**: 2025-01-16T09:00:00Z
- **Commit/PR**: abc123 or #42
- **Notes**: Brief description of what was done

---
## [ERR-20260305-001] openclaw-gateway-restart

**Logged**: 2026-03-05T17:30:20Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
openclaw gateway restart failed with tool-session transcript error

### Error
```
[openclaw] missing tool result in session history; inserted synthetic error result for transcript repair.
```

### Context
- Command: `openclaw gateway restart`
- Purpose: apply OpenClaw config change (Ollama API switch)
- Environment: ocg host, OpenClaw workspace

### Suggested Fix
Retry restart after confirming tool session stability; fall back to `openclaw gateway stop && sleep 2 && openclaw gateway start` if needed.

### Metadata
- Reproducible: unknown
- Related Files: /home/localadmin/.openclaw/openclaw.json
- See Also: 

---

## [ERR-20260305-002] openclaw-gateway-restart-systemctl

**Logged**: 2026-03-05T17:34:40Z
**Priority**: high
**Status**: pending
**Area**: infra

### Summary
Gateway restart via systemctl triggered tool-session transcript error

### Error
```
[openclaw] missing tool result in session history; inserted synthetic error result for transcript repair.
```

### Context
- Command: `systemctl --user restart openclaw-gateway`
- Purpose: apply OpenClaw config change
- Environment: ocg host

### Suggested Fix
Investigate tool-session transcript repair errors; confirm gateway health via systemctl status/logs.

### Metadata
- Reproducible: unknown
- Related Files: /home/localadmin/.openclaw/openclaw.json
- See Also: ERR-20260305-001

---

## [ERR-20260305-003] git-add-outside-repo

**Logged**: 2026-03-05T18:02:32Z
**Priority**: high
**Status**: pending
**Area**: config

### Summary
Attempted to `git add` a file outside the workspace repo

### Error
```
fatal: /home/localadmin/.openclaw/openclaw.json: '/home/localadmin/.openclaw/openclaw.json' is outside repository at '/home/localadmin/.openclaw/workspace'
```

### Context
- Command: `git add /home/localadmin/.openclaw/openclaw.json ITIL/policies/OPENCLAW_CONFIG_POLICY.md ITIL/policies/CHANGE_TICKETS.md`
- Workspace repo: /home/localadmin/.openclaw/workspace

### Suggested Fix
Only stage files within the workspace repo; document external config changes separately.

### Metadata
- Reproducible: yes
- Related Files: /home/localadmin/.openclaw/openclaw.json
- See Also: 

---
## [ERR-20260305-004] session-status-model-override

**Logged**: 2026-03-05T18:11:26Z
**Priority**: high
**Status**: pending
**Area**: config

### Summary
Failed to switch session model to default via session_status; model not allowed

### Error
```
Model "olla/qwen3.5:latest" is not allowed.
```

### Context
- Tool: session_status
- Input: model="olla/qwen3.5:latest"
- Goal: switch session back to default model after restart
- Environment: ocg host, OpenClaw workspace

### Suggested Fix
Verify model allowlist and provider config; update allowed models or use approved model IDs.

### Metadata
- Reproducible: yes
- Related Files: /home/localadmin/.openclaw/openclaw.json
- See Also: 

---
