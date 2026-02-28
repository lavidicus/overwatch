# Configuration Management Policy (ITIL-Aligned)

## Purpose

Ensure all configuration items (CIs) are:
- Identified and documented
- Controlled through their lifecycle
- Accurately tracked in the CMDB
- Audited for compliance
- Associated with related CIs

## Configuration Items (CIs)

### CI Categories

1. **Hardware**
   - Physical servers
   - Network devices (routers, switches, firewalls)
   - Storage systems
   - End-user devices

2. **Software**
   - Operating systems
   - Applications
   - Middleware
   - Libraries and dependencies

3. **Services**
   - Business services
   - IT services
   - Application services
   - Infrastructure services

4. **Documentation**
   - Runbooks
   - Architecture diagrams
   - Process documents
   - SOPs

5. **Credentials & Secrets**
   - API keys
   - Database passwords
   - SSH keys
   - Certificate files
   - **Note:** Store in secure vault, not plain text

## Configuration Baseline

### Baseline Definition

A configuration baseline is the approved, stable state of a CI at a specific point in time.

### Baseline Components

- **Version:** CI version number
- **Hash/Checksum:** For integrity verification
- **Dependencies:** Required supporting CIs
- **Configuration parameters:** All tunable settings
- **Documentation references:** Links to relevant docs

### Baseline Management

1. **Create baseline** when:
   - Initial deployment
   - After approved change
   - Before major maintenance
   - Quarterly (regular review)

2. **Update baseline** when:
   - Change is implemented
   - Configuration drift detected
   - Baseline is outdated

3. **Restore baseline** when:
   - Configuration drift exceeds threshold
   - Incident requires rollback
   - Compliance violation detected

## CMDB (Configuration Management Database)

### Required Fields

| Field | Description | Example |
|-------|-------------|---------|
| **CI ID** | Unique identifier | `SRV-001` |
| **CI Name** | Human-readable name | `web-server-01` |
| **CI Type** | Category | `Server` |
| **Status** | Lifecycle state | `In Production` |
| **Version** | Current version | `2.1.0` |
| **Location** | Physical/logical location | `DC1-Rack15` |
| **Owner** | Responsible party | `ops-team` |
| **Relationships** | Links to other CIs | `depends-on: DB-001` |
| **Last Modified** | When last changed | `2026-02-28` |
| **Tags** | Classification labels | `production, web` |

### CI Lifecycle States

1. **Planned:** In design, not deployed
2. **Staging:** Testing environment
3. **Production:** Live, serving users
4. **Deprecated:** No longer in use
5. **Retired:** Removed from CMDB

### Relationship Types

- **Depends on:** Requires this CI to function
- **Hosts:** This CI runs on this infrastructure
- **Connects to:** Network connection to this CI
- **Managed by:** This CI manages this
- **Part of:** Component of this CI
- **Provides:** This CI provides service to

## Configuration Control

### Change Control

All CI configuration changes must:
1. Go through Change Management process
2. Be documented in CMDB
3. Update configuration baseline
4. Notify stakeholders

### Configuration Drift Detection

- **Automated checks:** Daily/weekly scans
- **Threshold:** Define acceptable drift (% or absolute)
- **Alerting:** Notify when drift exceeds threshold
- **Remediation:** Auto-fix or manual intervention

### Access Control

- **Read:** All authorized personnel
- **Write:** Configuration owners + Change Manager
- **Admin:** Infrastructure team leads
- **Audit:** Security team

## Version Control

### Git Repository Structure

```
config/
├── infrastructure/
│   ├── servers/
│   ├── network/
│   └── storage/
├── applications/
│   ├── app-name/
│   └── another-app/
├── scripts/
│   ├── deployment/
│   └── maintenance/
└── documentation/
    ├── runbooks/
    └── architecture/
```

### Branching Strategy

- **main:** Production-ready configurations
- **staging:** Testing and validation
- **feature/**: Experimental changes
- **hotfix/**: Emergency fixes

### Commit Standards

- **Message format:** `[CI-ID] Short description`
- **Example:** `[SRV-001] Updated nginx configuration`
- **Include:** What changed, why, reference to RFC

### Tagging

- **Tag format:** `v[MAJOR].[MINOR].[PATCH]`
- **Tag when:** Releasing baseline, major change
- **Example:** `v2.1.0`

## Compliance & Audit

### Configuration Compliance

- **Policy:** All CIs must comply with security policies
- **Check:** Automated compliance scanning
- **Violations:** Alert and remediate
- **Documentation:** Audit trail of compliance checks

### Audit Requirements

- **Frequency:** Quarterly (or more for high-risk)
- **Scope:** All production CIs
- **Process:**
  1. Select CI sample
  2. Compare actual vs documented
  3. Verify change records
  4. Check access controls
  5. Document findings
- **Remediation:** Address any gaps

### Audit Trail

- **Who:** User who made the change
- **What:** Configuration change details
- **When:** Timestamp
- **Why:** Reference to change record
- **Result:** Success/failure

## Tools & Automation

### Configuration Management Tools

- **Ansible:** Infrastructure as code
- **Terraform:** Cloud resource provisioning
- **Puppet/Chef:** System configuration
- **Kubernetes:** Container orchestration

### Monitoring Tools

- **Prometheus/Grafana:** Configuration metrics
- **Nagios/Icinga:** Service monitoring
- **ELK Stack:** Log analysis

### CMDB Tools

- **ServiceNow:** Enterprise CMDB
- **Jira:** Ticketing + basic CMDB
- **Custom:** Self-built solutions

### Automated Compliance

- **Ansible lint:** Configuration validation
- **OpenSCAP:** Security compliance
- **Custom scripts:** Policy enforcement

## Roles & Responsibilities

### Configuration Manager
- Owns CMDB accuracy
- Reviews change requests
- Ensures compliance
- Conducts audits

### CI Owner
- Maintains CI documentation
- Implements approved changes
- Monitors CI health
- Reports issues

### Change Manager
- Reviews changes affecting CIs
- Ensures proper documentation
- Coordinates CAB meetings

### Security Team
- Defines compliance requirements
- Conducts security audits
- Reviews access controls

## Metrics & Reporting

- **CMDB accuracy:** % of CIs with correct data
- **Configuration drift:** Average drift per CI type
- **Change success rate:** % of changes without incidents
- **Compliance rate:** % of CIs meeting policy
- **Audit findings:** Number and severity

---

**Review cadence:** Quarterly
**Owner:** Configuration Manager
**Effective date:** 2026-02-28