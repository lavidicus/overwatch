# Change Request: CR-001 - Add Olla Server to CMDB

## Basic Info
- **Change ID**: CR-001
- **Date**: 2026-02-28 17:36 UTC
- **Requester**: Jeremy
- **Performed By**: Sam (ops butler AI)
- **Category**: Configuration Management
- **Priority**: P4 (Low)

## Description
Create CMDB entry for `olla` server (172.16.254.100) to document infrastructure asset for configuration management program.

## Background
Olla is the local LLM inference server running Ollama. It needs to be tracked in the CMDB for:
- Asset management
- Change tracking
- Compliance auditing
- Relationship mapping

## Change Details

### What Changed
- Created CMDB entry file: `ITIL/cmdb/olla-server.json`
- Defined configuration baseline for the server
- Documented relationships with services
- Added credential references (secure)
- Logged change history

### CI Details
- **CI ID**: SRV-001
- **CI Name**: ollama
- **CI Type**: Server
- **Category**: Hardware
- **Status**: Production
- **Location**: 172.16.254.100
- **Owner**: ops-team
- **Role**: AI/ML Inference

### Services Documented
- Ollama (port 11434, HTTP)

### Relationships Defined
- Hosts: Ollama Service (SVC-001)
- Part of: Inference Infrastructure (INFRA-001)

## Implementation
- [x] Created CMDB JSON file
- [x] Added baseline configuration
- [x] Documented credentials (references only)
- [x] Logged change history
- [x] Pushed to Git repository

## Verification
- [x] File created at `ITIL/cmdb/olla-server.json`
- [x] JSON structure validated
- [x] All required fields populated per policy
- [x] Change ticket created
- [x] Pushed to GitHub

## Rollback Plan
- Delete `ITIL/cmdb/olla-server.json` if entry is incorrect
- Restore from Git history if needed

## Post-Implementation Review
- [x] Entry created successfully
- [x] Follows ITIL configuration management policy
- [x] Ready for audit

## Notes
- Credentials stored as references, not plain text
- Next step: Add more servers to CMDB as discovered
- Consider automating CI discovery for ongoing maintenance

---
**Status**: Implemented
**Approved By**: Jeremy
**Implementation Date**: 2026-02-28 17:36 UTC