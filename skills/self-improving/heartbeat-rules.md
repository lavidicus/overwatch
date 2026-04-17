# Self-Improving Heartbeat Rules

## Daily Checks (Every 30 minutes)

### 1. Memory Health Check
- Verify MEMORY.md < 19KB
- Confirm corrections.md has recent entries
- Check if any corrections need promotion (3x usage)

### 2. Host Status
- Verify usm1 removed (not in network)
- Verify `olla` (usm2) active via SSH
- Check llama.cpp service running on `olla`

### 3. OpenClaw-OPS Health
- Confirm watchdog.sh running (5-min cron)
- Check gateway status
- Verify exec approvals active

### 4. Session Cleanup
- Review recent corrections
- Promote patterns used 3x in 7 days
- Demote unused entries after 30 days

## Weekly Review (Sunday 12:00 UTC)

### 1. Full Memory Audit
- Review all corrections since last week
- Promote/Archive as needed
- Update index.md with counts

### 2. System Health
- Check all hosts (ocg, olla, dc)
- Verify cron jobs running
- Confirm model service status

### 3. Documentation Update
- Review MEMORY.md for outdated info
- Update PKB if architecture changed
- Check PLAYBOOKS for improvements

## Monthly Review (1st of month)

### 1. Pattern Evaluation
- Review all promoted patterns
- Assess if any need demotion
- Archive cold patterns after 90 days

### 2. Performance Metrics
- Review execution logs
- Check error rates
- Identify optimization opportunities

## Safety Rules

- **Never** delete without asking
- **Always** cite source when using memory
- **Keep** heartbeat-state.md simple (≤10 lines)
- **Preserve** corrections.md (last 50 entries)
- **Never** reorganize outside ~/self-improving/

## Trigger Events

- User correction → Log to corrections.md
- Pattern used 3x → Promote to memory.md
- File > 100 lines → Compact/Archive
- 30 days unused → Demote to WARM
- 90 days unused → Archive to COLD

## Today's Setup (2026-04-04)

- ✅ Initialized ~/self-improving/
- ✅ Updated memory.md (OpenClaw architecture)
- ✅ Updated corrections.md (9 corrections logged)
- ✅ Set heartbeat rules
- ✅ Confirmed system health

## Next Review
2026-04-05 at 12:00 UTC