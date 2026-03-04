# ITIL-ISSUE-HEARTBEAT-NEWS-BRIEFING

**Issue ID:** ITIL-ISSUE-HEARTBEAT-NEWS-BRIEFING  
**Created:** 2026-03-04 12:26 UTC  
**Priority:** P2 (High)  
**Category:** Problem  
**Status:** New

## Summary

Morning news briefing scheduled for 6AM CST (12:00 UTC) was not delivered on 2026-03-04.

## Problem Description

**Expected:** Daily 6AM CST (12:00 UTC) news briefing via Signal  
**Actual:** No briefing delivered  
**Impact:** User missed important morning news update  
**Date:** 2026-03-04

## Root Cause Analysis

### Investigation Findings:

1. **Heartbeat Configuration:** HEARTBEAT.md exists with prompt for daily updates
   - Prompt: "Report blockers/opportunities. No updates → 'No blockers — <time>'."
   - **Missing:** Explicit news briefing schedule

2. **News Briefing Mechanism:**
   - Previous morning briefings were delivered manually on-demand
   - No automated cron job or heartbeat trigger configured for 6AM CST
   - User expected proactive delivery at specific time

3. **Timezone Consideration:**
   - Requested time: 6AM CST = 12:00 UTC
   - System running in UTC timezone
   - No cron job configured for 12:00 UTC daily

### Why It Was Missed:

- No automated trigger exists for morning news briefing
- Heartbeat runs on-demand when user messages matching prompt
- User assumed "HEARTBEAT_OK" message included news briefing
- News briefing was manual, not scheduled

## Timeline

- **2026-03-03 07:02 UTC:** Previous news briefing delivered (manually requested)
- **2026-03-03 13:08 UTC:** News briefing delivered after user asked
- **2026-03-04 12:00 UTC:** **MISSING** - Expected morning briefing not delivered
- **2026-03-04 12:13 UTC:** User requested news briefing (manually delivered)
- **2026-03-04 12:26 UTC:** Issue logged

## Current Configuration

**HEARTBEAT.md:**
```markdown
# HEARTBEAT.md

- Quick scan: SIP log, recent commits, pending tasks.
- Report only new blockers/opportunities. Keep under 240 chars.
- If nothing urgent, reply `No blockers — <UTC time>`.
```

**Missing:**
- ❌ News briefing task in heartbeat
- ❌ Cron job for 6AM CST (12:00 UTC)
- ❌ Proactive news delivery schedule

## Resolution Plan

### Short-term (Immediate)

1. **Add news briefing to HEARTBEAT.md:**
   ```markdown
   # HEARTBEAT.md

   - **6AM CST (12:00 UTC):** Morning news briefing (AP, Reuters, BBC)
   - Quick scan: SIP log, recent commits, pending tasks.
   - Report only new blockers/opportunities. Keep under 240 chars.
   - If nothing urgent, reply `No blockers — <UTC time>`.
   ```

2. **Create cron job for daily news briefing:**
   - Time: 12:00 UTC daily (6AM CST)
   - Action: Fetch news from AP, Reuters, BBC; send via Signal
   - Model: Use `openclaw-cost-tracker` skill pattern if available

### Medium-term

1. **Automated news delivery system:**
   - Use cron to fetch and compile news at 12:00 UTC
   - Deliver to user's Signal channel
   - Store briefing in memory/YYYY-MM-DD.md

2. **Heartbeat enhancement:**
   - If news briefing delivered, heartbeat prompt becomes secondary
   - Or combine: heartbeat includes news as default content

### Long-term

1. **Flexible scheduling:**
   - Configurable news briefing time
   - Multiple recipients (user + team)
   - Custom sources per recipient

2. **Smart filtering:**
   - Only deliver if significant news exists
   - Summarize vs. detailed briefings based on priority

## Implementation Steps

1. Update `HEARTBEAT.md` with news briefing task
2. Create cron job: `0 12 * * *` (12:00 UTC daily)
3. Test delivery at next scheduled time
4. Monitor for missed deliveries
5. Document in MEMORY.md

## Rollback Plan

If cron job causes issues:
1. Remove cron entry: `crontab -e`
2. Revert HEARTBEAT.md to previous state
3. Return to manual news delivery on-demand

## Related Issues

- **ITIL-ISSUE-GATEWAY-RESTART-AVAILABILITY:** Gateway restart issues
- **vLLM Provider Cleanup:** Configuration cleanup (resolved)
- **Context Window Fix:** 256k → 131k tokens (resolved)

## Verification

**After implementation:**
- ✅ Cron job scheduled for 12:00 UTC daily
- ✅ HEARTBEAT.md updated with news task
- ✅ News briefing delivered at 12:00 UTC on 2026-03-05
- ✅ Briefing logged to memory/YYYY-MM-DD.md

## Next Steps

1. Update HEARTBEAT.md
2. Create cron job
3. Schedule delivery for tomorrow (12:00 UTC)
4. Document in MEMORY.md

---

**Owner:** @Sam  
**Last Updated:** 2026-03-04 12:26 UTC  
**Tags:** heartbeat, news-briefing, automation, cron, p2