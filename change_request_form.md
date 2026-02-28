# Change Request Form (RFC Template)

## Basic Information

| Field | Value |
|-------|-------|
| **RFC ID** | `CHANGE-YYYY-NNNN` |
| **Title** | [Brief description] |
| **Requestor** | [Name] |
| **Date Submitted** | [YYYY-MM-DD] |
| **Requested Implementation Date** | [YYYY-MM-DD HH:MM] |
| **Estimated Duration** | [X hours/minutes] |
| **Priority** | Low / Medium / High / Critical |

## Change Details

### Description
[Brief description of the change]

### Business Justification
[Why is this change needed? What problem does it solve?]

### Technical Details
[Detailed technical description of the change]

### Scope
- **In Scope:** [Systems, services, configurations affected]
- **Out of Scope:** [Explicitly excluded items]

## Risk Assessment

### Risk Level
☐ Low ☐ Medium ☐ High ☐ Critical

### Risk Criteria
- **Low:** Minimal impact, well-tested, easy rollback, non-production
- **Medium:** Some user impact, rollback possible, requires testing
- **High:** Significant impact, complex rollback, requires CAB approval
- **Critical:** Service-affecting, potential data loss, emergency or CAB consensus

### Impact Assessment

| Area | Impact |
|------|--------|
| **Systems Affected** | [List all systems] |
| **Users Affected** | [Number and type of users] |
| **Dependencies** | [Downstream systems affected] |
| **Data Impact** | [Any data migration/corruption risk] |
| **Security Impact** | [Any security implications] |

## Implementation Plan

### Pre-Implementation Checklist
- [ ] Backup completed
- [ ] Rollback plan validated
- [ ] Stakeholders notified
- [ ] Monitoring configured
- [ ] Team ready
- [ ] Change approved

### Step-by-Step Implementation
1. [ ] Step 1
2. [ ] Step 2
3. [ ] Step 3
4. [ ] Verify step N success
5. [ ] Continue to next step

**Estimated start time:** [HH:MM]
**Expected completion:** [HH:MM]

### Rollback Plan
[What to do if implementation fails]

1. [ ] Rollback step 1
2. [ ] Rollback step 2
3. [ ] Verify rollback success
4. [ ] Notify stakeholders

### Testing Plan
[How to verify the change was successful]

1. [ ] Test 1
2. [ ] Test 2
3. [ ] Test 3

## Approvals

### Requestor
- **Name:** _______________
- **Signature:** _______________
- **Date:** _______________

### Technical Review (if required)
- **Reviewer:** _______________
- **Comments:** _______________
- **Date:** _______________

### Change Manager Approval
- **Approver:** _______________
- **Risk Level:** ☐ Low ☐ Medium ☐ High ☐ Critical
- **Decision:** ☐ Approved ☐ Rejected ☐ Requires More Info
- **Date:** _______________

### CAB Approval (if High/Critical)
- **CAB Chair:** _______________
- **Attendees:** _______________
- **Decision:** ☐ Approved ☐ Rejected ☐ Requires More Info
- **Date:** _______________

## Emergency Changes (if applicable)
- **Reason for emergency:** _______________
- **Approval (on-call owner):** _______________
- **CAB notification (post-facto):** _______________

## Implementation Log

| Timestamp | Action | Status | Notes |
|-----------|--------|--------|-------|
| [HH:MM] | Pre-change check | ☐ Pass ☐ Fail | [Notes] |
| [HH:MM] | Step 1 | ☐ Pass ☐ Fail | [Notes] |
| [HH:MM] | Step 2 | ☐ Pass ☐ Fail | [Notes] |
| [HH:MM] | Verification | ☐ Pass ☐ Fail | [Notes] |

## Post-Implementation Review

### Outcome
☐ Successful ☐ Partial Success ☐ Failed

### Issues Encountered
[Describe any problems that occurred]

### Lessons Learned
[What went well, what didn't, what to improve]

### Follow-up Actions
- [ ] Action 1 - Owner: ____ - Due: ____
- [ ] Action 2 - Owner: ____ - Due: ____

### PIR Participants
- _______________
- _______________

---

**Change Closed By:** _______________
**Date Closed:** _______________