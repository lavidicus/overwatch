# Change Request: Session Cleanup Automation

**ID:** ITIL-CHANGE-SESSION-CLEANUP  
**Date:** 2026-03-04 21:51 UTC  
**Requester:** Lavid  
**Status:** Approved  
**Priority:** P3 (Medium)

## Change Summary

Implement automated daily session cleanup to prevent context window overflow and disk space consumption from stale session files.

## Problem Statement

- Session files can accumulate to 3MB+ over time
- Stale sessions from days/weeks ago consume disk space
- Context window can fill up unexpectedly (previous overflow incident)
- Manual cleanup required regularly

## Solution

1. **Immediate Action:** Clean up existing stale sessions
   - Deleted 22 stale session files
   - Reclaimed ~2.4MB disk space
   - Preserved only active session (6f545e0e-0ae6-4f6f-b806-3fe2dad3203c.jsonl)

2. **Automation:** Daily cron job to prevent accumulation

## Technical Details

### Cleanup Script

Location: `~/.openclaw/scripts/cleanup-sessions.sh`

Logic:
1. Identify active sessions from `sessions.json`
2. Delete all `.jsonl*` files not in active set
3. Delete `.reset.*` and `.deleted.*` backup files
4. Log cleanup to daily memory file
5. Send notification summary

### Cron Schedule

- **Time:** Daily at 06:00 UTC (midnight CST)
- **Purpose:** Early morning maintenance before peak usage

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Delete active session | High | Low | Script checks `sessions.json` for active IDs |
| Delete recent session | Medium | Low | Only deletes files not matching current active sessions |
| Disk space issue persists | Low | Low | 644KB current usage, plenty of headroom |

## Rollback Plan

If issues occur:
1. Disable cron: `crontab -e` → comment out line
2. Restore from backup if needed (files no longer exist)
3. Monitor for 24 hours

## Success Criteria

- ✅ No stale session files accumulate
- ✅ Disk usage remains <10MB for sessions directory
- ✅ Active sessions unaffected
- ✅ No context overflow incidents

## Implementation Tasks

- [x] Clean up existing stale sessions (2.4MB reclaimed)
- [ ] Create cleanup script
- [ ] Install cron job
- [ ] Document in daily memory
- [ ] Test cron execution
- [ ] Monitor for 7 days

---

**Approved by:** Lavid  
**Implementation Date:** 2026-03-04  
**Post-Implementation Review:** 2026-03-11