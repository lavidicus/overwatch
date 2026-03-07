# Proxmox VM/LXC Migration

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [proxmox, migration, vm, lxc, live-migration]
---

## Overview

Playbook for migrating VMs and LXC containers between Proxmox nodes, including live migration and storage migration.

## Priority

**P2** — Planned maintenance, not emergency

## Category

**Change Management**

## Estimated Duration

- **Total:** ~15-60 minutes (depends on VM size)
- **Critical path:** ~5-30 minutes (actual migration)
- **Notes:** Live migration has minimal downtime

## Communication

- **Before starting:** Notify users of brief interruption
- **During:** Update on progress for large migrations
- **After:** Confirm successful migration

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Migration failure | Medium | Verify rollback plan |
| Brief service interruption | Low | Use live migration |
| Storage inconsistency | Medium | Verify checksums |

## Prerequisites

- **Access:** Root or sudo on both source and target nodes
- **Network:** Migration network configured
- **Storage:** Shared or replicatable storage

## Procedure

### Live Migration (VM)

```bash
# Migrate VM to another node
qm migrate <vmid> <target_node>

# Migrate with storage
qm migrate <vmid> <target_node> --online --storage <target_storage>

# Migrate with specific parameters
qm migrate <vmid> <target_node> --bandwidth-limit 100
```

### Live Migration (LXC)

```bash
# Migrate LXC container
pct migrate <ctid> <target_node>

# Migrate with storage
pct migrate <ctid> <target_node> --storage <target_storage>
```

### Cold Migration

```bash
# Stop VM first
qm stop <vmid>

# Migrate
qm migrate <vmid> <target_node>

# Start on target
qm start <vmid>
```

### Storage Migration Only

```bash
# Migrate VM disk to different storage
qm moveDisk <vmid> <disk_id> <target_storage>

# Migrate LXC storage
pct move <ctid> <target_storage>
```

## Verification

```bash
# VM is running on target
qm list <target_node>

# LXC is running on target
pct list <target_node>

# Verify storage location
qm status <vmid> --verbose
```

## Common Issues

### Migration Failed

**Symptoms:**
- Migration command returns error
- VM stuck in migration state

**Resolution:**

```bash
# Check network connectivity
ping <target_node>

# Verify shared storage accessible
pvesm status

# Cancel stuck migration
qm reset <vmid>
```

## Rollback

```bash
# Migrate back to source
qm migrate <vmid> <source_node>

# Or restore from backup
vzrestore <vmid> <backup_file>
```

## Related Playbooks

- [[proxmox-ha-cluster.md]] — HA configuration
- [[proxmox-storage-management.md]] — Storage operations

## Notes

- Live migration requires shared storage or --online flag
- Network latency affects migration speed
- Test migrations in non-production first

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
