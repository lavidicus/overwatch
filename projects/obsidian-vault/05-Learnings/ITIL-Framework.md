# ITIL Framework Integration

**Date:** 2026-05-08
**Source:** ITIL/ directory, PKB/ directory
**Tags:** #ITIL #incident-management #problem-management #change-management

## Overview
The workspace implements an ITIL-aligned issue management workflow for tracking, managing, and resolving operational incidents, service requests, and problems.

## Issue Categories (ITIL Standards)

### Incident Management
- **Priority 1 (Critical)**: Service down, business-critical impact
- **Priority 2 (High)**: Significant impact, workaround available
- **Priority 3 (Medium)**: Moderate impact, limited scope
- **Priority 4 (Low)**: Minor impact, single user

### Service Requests
- Standard requests following approved procedures
- Access provisioning, password resets, equipment requests
- Pre-approved with defined SLAs

### Problem Management
- Root cause analysis for recurring incidents
- Known error tracking
- Workaround documentation

### Change Management
- Standard changes (pre-approved)
- Normal changes (require CAB approval)
- Emergency changes (post-facto review)

## Workflow Stages
1. **New** - Issue logged, awaiting triage
2. **Triage** - Categorization, priority assignment
3. **In Progress** - Investigation or remediation underway
4. **Pending** - Waiting on external party or information
5. **Resolved** - Fix implemented, awaiting verification
6. **Closed** - Verified and formally closed

## Operational Rules

### Response Times (SLA)
- P1: 15 min response, 4 hour resolution
- P2: 1 hour response, 8 hour resolution
- P3: 4 hour response, 24 hour resolution
- P4: 24 hour response, 72 hour resolution

### Escalation
- Unresolved P1 after 2 hours → Senior on-call
- Unresolved P2 after 4 hours → Team lead
- SLA breach → Manager notification

### Documentation Requirements
- All incidents: root cause, timeline, resolution
- All problems: RCA report, known errors, prevention measures
- All changes: change log, rollback plan, post-implementation review

## Integration Points
- GitHub issues for engineering tickets (via `/gh-issues`)
- Email parsing for service requests
- Monitoring alerts auto-logged as incidents
- Manual logging via workspace commands

## Related Files
- `ITIL/ITIL-ISSUE-MANAGEMENT.md` - Full ITIL workflow documentation
- `ITIL/playbooks/` - Operational procedures and runbooks
- `PKB/resources/Concepts/ITIL Playbook Integration.md` - Cross-references

---
*Created: 2026-05-08 | Last updated: 2026-05-08*