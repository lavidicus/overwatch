# Change Management Policy (ITIL-Aligned)

## Purpose

Ensure all changes to systems, configurations, and infrastructure are:
- Properly assessed for risk and impact
- Approved by appropriate stakeholders
- Documented and traceable
- Reversible when possible
- Communicated to affected parties

## Change Types

### Standard Changes
- Pre-approved, low-risk, well-understood
- Follow documented procedures
- Examples: routine patching, user onboarding, backup rotation
- **Approval:** Pre-approved (no ticket required)
- **Documentation:** Minimal (log only)

### Normal Changes
- Risk-assessed, require approval before implementation
- Examples: configuration updates, service deployments, infrastructure changes
- **Approval:** Change Manager or CAB (Change Advisory Board)
- **Documentation:** Full change record required

### Emergency Changes
- Urgent, required to restore service or prevent major impact
- Expedited approval process
- **Approval:** On-call owner + CAB notification (post-facto)
- **Documentation:** Full retrospective change record

## Change Process

### 1. Request for Change (RFC)

**Required fields:**
- Change title
- Description and business justification
- Risk assessment (Low/Medium/High/Critical)
- Impact assessment (systems, users, dependencies)
- Implementation plan (step-by-step)
- Rollback plan (if implementation fails)
- Testing plan
- Scheduled window
- Requestor
- Estimated duration

### 2. Assessment & Approval

- **Risk scoring:**
  - Low: Minimal impact, easy rollback, tested
  - Medium: Some impact, rollback possible, requires testing
  - High: Significant impact, rollback complex, requires CAB approval
  - Critical: Service-affecting, requires emergency or CAB consensus

- **Approval workflow:**
  - Low risk: Self-approve (Standard) or Manager (Normal)
  - Medium risk: Manager approval
  - High risk: CAB approval
  - Critical: Emergency approval process

### 3. Implementation

- **Pre-change checklist:**
  - [ ] Backup completed
  - [ ] Rollback plan validated
  - [ ] Stakeholders notified
  - [ ] Monitoring in place
  - [ ] Team ready

- **During change:**
  - Follow implementation plan step-by-step
  - Document actual timestamps
  - Report issues immediately
  - Execute rollback if thresholds breached

- **Post-change:**
  - Verify success (smoke tests)
  - Update documentation
  - Close change record
  - Communicate completion

### 4. Review (Post-Implementation Review)

- **Required for:**
  - All High/Critical risk changes
  - Failed changes (any risk level)
  - Emergency changes
  - Changes with significant unplanned impact

- **Review questions:**
  - What was the intended outcome?
  - What actually happened?
  - Were there issues? If so, why?
  - What can we improve?
  - Are there follow-up actions?

## Configuration Management

### Configuration Items (CIs)

Track all IT assets and their relationships:
- Servers, containers, VMs
- Network devices
- Applications and services
- Documentation and runbooks
- Credentials and secrets (stored securely, not in plain text)

### Configuration Baseline

- Document expected configuration states
- Version control all configs (Git)
- Change tracking via CI version history
- Automated compliance checks where possible

### CMDB (Configuration Management Database)

- Source of truth for configuration state
- Updated on every change
- Linked to change records
- Accessible to stakeholders

## Roles & Responsibilities

### Change Manager
- Owns the change process
- Reviews RFCs, assigns risk levels
- Chairs CAB meetings
- Ensures compliance

### Requestor
- Submits RFCs
- Provides technical details
- Executes changes (if approved)
- Documents outcomes

### Change Advisory Board (CAB)
- Reviews High risk changes
- Includes: Technical leads, Ops, Security, Business reps
- Meets: Weekly (or ad-hoc for emergencies)

### Approver
- Validates risk assessment
- Confirms readiness (backups, rollback, testing)
- Grants approval

## Metrics & Reporting

- **Change success rate:** % of changes implemented without failure
- **Change failure rate:** % of changes causing incidents
- **Emergency change rate:** % of emergency vs planned changes
- **Average change duration:** Time from request to closure
- **Rollback rate:** % of changes requiring rollback
- **CAB cycle time:** Time from RFC submission to decision

## Tools & Automation

- **Git:** Configuration version control
- **Ticketing system:** Change records and approvals
- **CI/CD pipelines:** Automated standard changes
- **Monitoring:** Real-time change validation
- **Backup systems:** Pre-change snapshots

## Compliance & Audit

- All changes must be documented
- Audit trail must be maintained (who, what, when, why)
- Regular audits of change records
- Compliance with security policies

---

**Review cadence:** Quarterly or after major incidents
**Owner:** Change Manager
**Effective date:** 2026-02-28