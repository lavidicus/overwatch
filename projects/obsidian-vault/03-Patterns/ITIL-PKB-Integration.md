# ITIL-PKB Integration Patterns

**Date:** 2026-05-08
**Source:** PKB/resources/Concepts/ITIL Playbook Integration.md
**Tags:** #ITIL #PKB #integration #cross-reference

## How This Works

**PKB (this vault):** Knowledge repository — "How do I do X?"
- Installation guides
- Configuration references
- Technical documentation

**ITIL Playbooks:** Operational procedures — "How do we handle incident Y?"
- Incident response steps
- Runbooks
- Escalation procedures

## Cross-References

### Proxmox-Related

| ITIL Playbook | Related PKB Topics |
|---------------|--------------------|
| `proxmox-ha-cluster.md` | [[Virtualization]], [[Storage Systems]] |
| `proxmox-backup-restore.md` | [[Storage Systems]], [[Virtualization]] |
| `proxmox-storage-management.md` | [[Storage Systems]] (ZFS, Ceph, GlusterFS) |
| `proxmox-networking.md` | [[Network Security]] |
| `proxmox-node-swap-high.md` | [[pkb/areas/System guides/Linux Operating System/Creating Logical Volumes.md]] |
| `ubuntu-pin-kernel-6.5.11.md` | [[Virtualization]] (NVIDIA GRID requires kernel pinning) |

### Linux System Administration

| ITIL Playbook | Related PKB Topics |
|---------------|--------------------|
| Various | [[pkb/areas/System guides/Linux Operating System/]] — Full Linux guide collection |

## Usage Patterns

### Incident Response
1. Check ITIL playbook for procedure
2. Reference PKB for technical details
3. Log actions in OpenClaw memory

### Knowledge Updates
1. New incident reveals knowledge gap
2. Create/update PKB guide
3. Reference from ITIL playbook

## Key Insights
1. **PKB is for "how"** - Technical implementation details
2. **ITIL is for "what"** - Operational procedures and responses
3. **Memory is for "when"** - Timeline and context of events
4. **Integration creates completeness** - All three together provide full situational awareness

## Related Files
- `ITIL/ITIL-ISSUE-MANAGEMENT.md` - ITIL workflow documentation
- `PKB/README.md` - PKB structure and usage
- `memory/` - Daily operational logs

---
*Created: 2026-05-08 | Last updated: 2026-05-08*