# TOOLS.md - Local Notes

Skills define _how_ tools work. This file is for _your_ specifics — the stuff that's unique to your setup.

## What Goes Here

Things like:

- Camera names and locations
- SSH hosts and aliases
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras

- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH

- home-server → 192.168.1.100, user: admin

### TTS

- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## 🚨 File Edit Tool Constraint (CRITICAL)

**Problem:** The `edit` tool fails silently with "Invalid diff" errors when text doesn't match exactly (whitespace, line endings, etc.)

**Solution:**
1. **Read file first** with `read` to get exact content
2. **Use that exact content** in `oldText` parameter
3. **Fallback:** If `edit` fails, use `write` which overwrites without exact matching
4. **Default strategy:** Use `write` for complete file overwrites; use `edit` only for small, precise changes

**Example workflow:**
```bash
# Read first
read file.txt → get exact content

# Edit with exact match
edit oldText="<exact content from read>" newText="<new content>"

# Fallback if edit fails
write content="<full new content>"
```

---

Add whatever helps you do your job. This is your cheat sheet.

<!-- antfarm:workflows -->
# Antfarm Workflows

Antfarm CLI (always use full path to avoid PATH issues):
`node ~/.openclaw/workspace/antfarm/dist/cli/cli.js`

Commands:
- Install: `node ~/.openclaw/workspace/antfarm/dist/cli/cli.js workflow install <name>`
- Run: `node ~/.openclaw/workspace/antfarm/dist/cli/cli.js workflow run <workflow-id> "<task>"`
- Status: `node ~/.openclaw/workspace/antfarm/dist/cli/cli.js workflow status "<task title>"`
- Logs: `node ~/.openclaw/workspace/antfarm/dist/cli/cli.js logs`

Workflows are self-advancing via per-agent cron jobs. No manual orchestration needed.
<!-- /antfarm:workflows -->

