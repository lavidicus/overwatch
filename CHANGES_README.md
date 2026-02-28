# Change & Configuration Management

ITIL-aligned change management framework for tracking and controlling changes to infrastructure and applications.

## Quick Start

### 1. Create a Change Request

```bash
./scripts/create_change_request.sh "Update nginx configuration"
```

This creates a new RFC file in `changes/CHANGE-YYYY-NNNN.md`

### 2. Fill in the Details

Edit the created file with:
- Change description and justification
- Risk assessment
- Implementation and rollback plans
- Testing procedures

### 3. Get Approval

- **Low risk:** Self-approve
- **Medium risk:** Manager approval
- **High/Critical risk:** CAB approval

### 4. Track Configuration Changes

```bash
# Add/update CI in CMDB
./scripts/track_config_change.sh add SRV-001 "web-server-01" Server "In Production" "ops-team" "DC1-Rack15" "2.1.0"

# Log the change
./scripts/track_config_change.sh log SRV-001 "configuration" "Updated nginx.conf" "CHANGE-2026-0001" "admin"

# Check CI status
./scripts/track_config_change.sh status SRV-001

# List all CIs
./scripts/track_config_change.sh list
```

## File Structure

```
workspace/
├── CHANGE_MANAGEMENT_POLICY.md          # Main policy document
├── CONFIGURATION_MANAGEMENT_POLICY.md   # CMDB policy
├── change_request_form.md               # RFC template
├── CAB_MEETING_NOTES.md                 # Meeting template
├── changes/                             # Change request files
│   └── CHANGE-2026-0001.md
├── cmdb.json                            # Configuration Management Database
├── config_changes.log                   # Audit trail
├── scripts/
│   ├── create_change_request.sh
│   └── track_config_change.sh
└── CHANGES_README.md                    # This file
```

## Change Types

| Type | Risk | Approval | Documentation |
|------|------|----------|---------------|
| **Standard** | Low | Pre-approved | Log only |
| **Normal** | Medium/High | Change Manager/CAB | Full RFC |
| **Emergency** | Critical | On-call + CAB (post-facto) | Retrospective |

## Risk Assessment

- **Low:** Minimal impact, easy rollback, non-production
- **Medium:** Some user impact, rollback possible
- **High:** Significant impact, complex rollback, CAB approval
- **Critical:** Service-affecting, emergency process

## CAB (Change Advisory Board)

- **Meets:** Weekly (or ad-hoc for emergencies)
- **Attendees:** Change Manager, Technical Leads, Security, Business Reps
- **Purpose:** Review High/Critical risk changes

### Meeting Template

Use `CAB_MEETING_NOTES.md` to track:
- Emergency change reviews
- Normal change approvals
- Process improvements
- Metrics review

## Configuration Management

### CI Categories

- **Hardware:** Servers, network, storage
- **Software:** OS, applications, middleware
- **Services:** Business and IT services
- **Documentation:** Runbooks, diagrams
- **Credentials:** Secrets (secure vault only)

### CMDB Fields

Each CI must track:
- ID, Name, Type, Status
- Version, Location, Owner
- Relationships (depends-on, hosts, etc.)
- Last modified timestamp

### Baseline Management

1. **Create baseline** after deployment or approved change
2. **Update baseline** on configuration changes
3. **Restore baseline** on drift or incidents
4. **Version control** all configurations (Git)

## Compliance & Audit

- All changes must be documented
- Audit trail maintained (who, what, when, why)
- Quarterly audits of change records
- Compliance with security policies

## Metrics

Track these KPIs:
- **Change success rate:** % without failure
- **Change failure rate:** % causing incidents
- **Emergency change rate:** % emergency vs planned
- **Rollback rate:** % requiring rollback
- **CMDB accuracy:** % with correct data

## Getting Help

- **Policy questions:** Review CHANGE_MANAGEMENT_POLICY.md
- **Template questions:** See change_request_form.md
- **Technical issues:** Check scripts/README.md (if exists)
- **Process violations:** Report to Change Manager

---

**Owner:** Change Manager  
**Last Updated:** 2026-02-28  
**Review Cadence:** Quarterly