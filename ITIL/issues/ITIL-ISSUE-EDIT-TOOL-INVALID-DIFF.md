# ITIL-ISSUE-EDIT-TOOL-INVALID-DIFF

**Issue ID:** ITIL-ISSUE-EDIT-TOOL-INVALID-DIFF  
**Created:** 2026-03-06 04:44 UTC  
**Priority:** P2 (High)  
**Category:** Incident  
**Status:** In Progress

## Summary
The `edit` tool fails with "Invalid diff: now finding less tool calls!" error, causing silent failures that halt workflow.

## Problem Description
When using the `edit` tool, it fails silently with "Invalid diff" errors when the exact text doesn't match (whitespace, line endings, etc.). This causes:
- Silent failures without clear error messages
- Workflow interruption
- "Invalid diff: now finding less tool calls!" errors
- Activity drops and stopped work

## Root Cause
The `edit` tool requires **exact text matching** including:
- Trailing/leading whitespace
- Line endings (LF vs CRLF)
- Exact character sequences

Any mismatch causes the edit to fail silently, and the tool returns an "Invalid diff" error that doesn't clearly indicate the problem.

## Impact
- **Severity:** High - blocks file modifications
- **Frequency:** Recurring (user reports multiple instances)
- **Workflow Impact:** Stops productivity, requires manual intervention

## Timeline
- **Detected:** 2026-03-06 04:44 UTC
- **Acknowledged:** 2026-03-06 04:44 UTC
- **Current Stage:** Investigation/Resolution

## Resolution Strategy

### Immediate Workaround
When using `edit` tool:
1. **Always read the file first** with `read` to get exact content
2. Use that exact content in the `oldText` parameter
3. If `edit` fails, fall back to `write` which overwrites without exact matching

### Long-term Fix
Update operating practice:
- **Default to `write`** for new content or complete overwrites
- **Use `edit` only when** I need to preserve surrounding content and have exact match
- **Read before edit** - never guess the exact text
- **Document this** in TOOLS.md as a known constraint

## Prevention
- Add to TOOLS.md: "When editing files, read first to get exact content"
- Consider using `write` as primary method for file modifications
- Test edits on small sections before large changes

## Next Steps
1. ✅ Document in TOOLS.md
2. ✅ Update personal operating practice
3. ✅ Use `write` for new files/complete overwrites
4. ✅ Read file before using `edit`

---
**Owner:** @Sam  
**Tags:** edit, tool, file, incident, workflow