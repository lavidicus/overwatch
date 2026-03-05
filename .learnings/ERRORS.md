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
