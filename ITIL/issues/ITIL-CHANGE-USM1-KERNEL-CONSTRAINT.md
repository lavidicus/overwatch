# Change Request: usm1 Kernel Version Lock

**ID:** ITIL-CHANGE-USM1-KERNEL-CONSTRAINT  
**Date:** 2026-03-05 03:42 UTC  
**Requester:** Lavid  
**Status:** Approved  
**Priority:** P1 (Critical)

## Change Summary

Lock usm1 host kernel to 6.5.13-5-pve to maintain NVIDIA VGPU driver compatibility.

## Problem Statement

- usm1 runs NVIDIA VGPU passthrough
- NVIDIA VGPU drivers only support kernels ≤ 6.5.x
- Automatic kernel updates would break VGPU functionality
- Current kernel: 6.5.13-5-pve

## Solution

### Immediate Actions

1. **Document constraint** in MEMORY.md ✅
2. **Create configuration management rules** to prevent kernel updates
3. **Pin package versions** where possible

### Configuration Changes Required

**APT Package Pinning (Debian/Ubuntu):**
```bash
# /etc/apt/preferences.d/nvidia-kernel-pin
Package: linux-image-*
Pin: version 6.5.13-5*
Pin-Priority: 1001
```

**Systemd Mask (if applicable):**
```bash
systemctl mask unattended-upgrades.service --now  # If auto-updates enabled
```

**Monitoring:**
- Alert on any kernel update attempts
- Regular audit of kernel version
- Document in runbook

## Risk Assessment

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| Kernel update breaks VGPU | Critical | High | Pin version, disable auto-updates |
| Security vulnerabilities | Medium | Medium | Manual patch review, network isolation |
| Driver incompatibility | High | Medium | Test before any future update |

## Rollback Plan

If kernel update occurs:
1. Reboot to previous kernel from GRUB
2. Reinstall NVIDIA VGPU drivers
3. Investigate what triggered the update
4. Reinforce lock mechanism

## Success Criteria

- ✅ Kernel version remains 6.5.13-5-pve
- ✅ No automatic updates applied
- ✅ VGPU passthrough continues to function
- ✅ Constraint documented in MEMORY.md

## Implementation Tasks

- [x] Document constraint in MEMORY.md (2026-03-05 03:42 UTC)
- [ ] Create APT package pinning configuration
- [ ] Disable/limit automatic kernel updates
- [ ] Add monitoring/alerting for kernel version changes
- [ ] Update runbook/documentation
- [ ] Notify team of constraint

## Related Systems

- **usm2:** 172.16.254.232 - runs 6.17.9-1-pve (no NVIDIA VGPU)
- **ocg (Sam):** 172.16.254.101 - runs 6.17.9-1-pve
- **olla:** 172.16.254.100 - runs 6.17.9-1-pve

---

**Approved by:** Lavid  
**Implementation Date:** 2026-03-05  
**Post-Implementation Review:** 2026-03-12