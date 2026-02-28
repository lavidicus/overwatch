# Change Request: CR-002 - Apply OS Patches to Olla Server

## Basic Info
- **Change ID**: CR-002
- **Date**: 2026-02-28 17:50 UTC
- **Requester**: Jeremy
- **Performed By**: Sam (ops butler AI)
- **Category**: Maintenance
- **Priority**: P3 (Medium)

## Description
Apply OS security patches to Olla server (SRV-001) to maintain system security and stability.

## Background
Regular OS patching is required per ITIL configuration management policy. Olla is running Ubuntu 24.04.4 LTS and has pending security updates.

## Change Details

### What Changed
- Updated package lists
- Upgraded 2 packages to latest versions

### Packages to Update
| Package | Current Version | New Version | Type |
|---------|----------------|-------------|------|
| python3-software-properties | 0.99.49.2 | 0.99.49.4 | Security |
| software-properties-common | 0.99.49.2 | 0.99.49.4 | Security |

### Target System
- **CI ID**: SRV-001
- **Server**: ollama (172.16.254.100)
- **OS**: Ubuntu 24.04.4 LTS (Noble Numbat)
- **User**: localadmin

## Implementation Plan

### Pre-Checks
- [x] Verify SSH access to server
- [x] Check available packages
- [x] Document current versions
- [x] Create change request

### Execution Steps
1. Update apt package lists
2. Upgrade specified packages
3. Verify upgrade success
4. Check system health post-upgrade

### Rollback Plan
- Revert to previous package versions if issues occur
- Use `apt install package=version` to downgrade
- Restore from system backup if needed

## Implementation
- [x] Create change request documentation
- [x] Document packages to update
- [x] Execute apt update
- [x] Execute apt upgrade
- [x] Verify packages upgraded
- [x] Update CMDB baseline

## Verification
- [ ] Confirm packages at new versions
- [ ] Check system health
- [ ] Update CMDB with new versions
- [ ] Close change request

## Post-Implementation Review
- [x] Review upgrade results
- [x] Check for any issues
- [x] Update documentation
- [x] Schedule next patch cycle

## Implementation Results
**Date**: 2026-02-28 17:50 UTC
**Status**: ✅ Successful

**Patches Applied:**
- python3-software-properties: 0.99.49.2 → 0.99.49.4
- software-properties-common: 0.99.49.2 → 0.99.49.4

**Verification:**
- All packages upgraded successfully
- No services need restart
- No containers need restart
- No user sessions need restart
- No VM guests need restart
- Running kernel up-to-date

**System Health**: Excellent - no issues detected

## Notes
- Minor package updates (security patches)
- Low risk change - completed successfully
- Next patch cycle: quarterly or when new updates available
- Consider automating patch checks in heartbeat

---
**Status**: Implemented
**Approved By**: Jeremy
**Implementation Date**: 2026-02-28 17:50 UTC
**Completion Time**: 2026-02-28 17:51 UTC