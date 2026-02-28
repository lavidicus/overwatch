# Change Request: CR-003 - Implement Token Optimization

## Basic Info
- **Change ID**: CR-003
- **Date**: 2026-02-28 18:07 UTC
- **Requester**: Jeremy
- **Performed By**: Sam (ops butler AI)
- **Category**: Optimization
- **Priority**: P3 (Medium)

## Description
Implement token optimization measures from SIP plan to reduce token usage and costs while maintaining response quality.

## Background
SIP log (2026-02-26) identified token spend optimization as a proposed improvement. This change implements the quick wins from the plan.

## SIP Plan Summary

**Goal:** Lower token usage through:
1. Prompt hygiene
2. Model routing
3. Heartbeat efficiency
4. Response conciseness

## Change Details

### What Changed

**1. Heartbeat Prompt Optimization**
- **Before:** "Check: Any blockers, opportunities, or progress updates needed?"
- **After:** "Report blockers/opportunities. No updates → 'No blockers — <time>'"
- **Expected Impact:** ~60-70% reduction in heartbeat tokens (150 → ~50 tokens)

**2. Token Optimization Playbook Created**
- File: `ITIL/playbooks/token-optimization.md`
- Contains all optimization strategies
- Provides measurable metrics and success criteria

**3. Response Guidelines Defined**
- Routine tasks: <50 tokens
- Status updates: Bullet points only
- Complex work: Full explanation
- Confirmations: One sentence + result

### Implementation Steps

**Phase 1: Quick Wins (Complete)**
- [x] Create token optimization playbook
- [x] Define heartbeat prompt optimization
- [x] Document response guidelines

**Phase 2: Apply Changes**
- [ ] Update heartbeat prompt in config
- [ ] Apply compact reply guidelines
- [ ] Audit system prompt hygiene

**Phase 3: Monitoring**
- [ ] Track token usage before/after
- [ ] Verify response quality unchanged
- [ ] Schedule periodic cleanup

## Expected Impact

### Token Reduction
- **Heartbeat messages:** 60-70% reduction
- **Routine updates:** ~40% reduction
- **Daily total:** ~30% reduction (estimated)

### Cost Impact
- **Current:** Using local model only (olla/qwen3.5:latest)
- **Projected:** Maintain local-only usage, no paid model fallback
- **Savings:** 100% on paid model costs (already optimized)

## Verification

### Before Changes
- Heartbeat prompt: "Check: Any blockers, opportunities, or progress updates needed?"
- Avg heartbeat tokens: ~150 (estimated)

### After Changes
- Heartbeat prompt: "Report blockers/opportunities. No updates → 'No blockers — <time>'"
- Target heartbeat tokens: <100

## Rollback Plan
- Revert heartbeat prompt to original
- Remove playbook if not needed
- Restore session history if cleanup causes issues

## Post-Implementation Review

### Metrics to Track
- Daily token count (by model)
- Heartbeat token usage
- Response quality (user satisfaction)
- Cost per day (should be $0 with local models)

### Success Criteria
- Heartbeat messages: <100 tokens avg
- Daily token spend: <10k tokens
- Response quality: No degradation

## Notes
- Primary model already optimized (local, free)
- Focus on reducing token volume, not cost
- Monitor for quality degradation
- Consider implementing automated cleanup cron

---
**Status**: In Progress
**Approved By**: Jeremy
**Implementation Date**: 2026-02-28 18:07 UTC