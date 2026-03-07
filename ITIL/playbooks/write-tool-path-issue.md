# Playbook: Write Tool Path Validation Issues

---
**Author:** Sam
**Created:** 2026-02-28
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [write-tool, path, validation, workaround]
---

## Overview

The `write` tool rejects paths containing `~` even though they expand to valid locations. This playbook documents the workaround options.

## Priority

**P3** — Tooling annoyance, low risk

## Category

**Operations**

## Estimated Duration

- **Total:** ~5-10 minutes
- **Critical path:** ~2 minutes (apply workaround)
- **Notes:** Depends on target file

## Communication

- **Before starting:** No notification needed
- **After completion:** Log fix if recurring
- **If blocked:** Use absolute path fallback

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wrong file path | Medium | Use absolute paths |
| Accidental overwrite | Medium | Back up first |
| Tool failure | Low | Use exec fallback |

## Problem

The `write` tool rejects paths containing `~` even though they expand to valid locations.

**Error message:**
```
Write: to <path> (N chars) failed
```

## When This Happens

- Writing to files outside the workspace root
- Paths starting with `~` (home directory shorthand)
- Attempting to edit config files like `~/.openclaw/openclaw.json`

## Solutions

### Option 1: Use `sed` via exec
```bash
sed -i 's/old/new/' ~/.openclaw/openclaw.json
```

### Option 2: Use absolute path
```bash
write(path="/home/localadmin/.openclaw/openclaw.json", content="...")
```

### Option 3: Copy to workspace, edit, copy back
1. Copy file to workspace
2. Edit with `write` tool
3. Copy back with `exec`

## Prevention

When working with config files outside workspace:
- Check if `write` tool accepts the path first
- If it fails, fall back to `exec` with `sed` or `cp`
- Prefer absolute paths over `~` shorthand

## Related Issues

- Issue #2026-02-28-001: Write tool path validation bug

## See Also

- TOOLS.md for file operation guidelines

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
