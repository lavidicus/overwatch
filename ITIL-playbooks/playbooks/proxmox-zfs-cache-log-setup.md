# Proxmox ZFS Cache/Log Setup (Post-Install)

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [proxmox, zfs, cache, slog, performance]
---

## Overview

Playbook for configuring ZFS after Proxmox install to add NVMe cache (L2ARC) and log (SLOG) devices, based on existing admin guide.

## Priority

**P2** — Performance optimization, not emergency

## Category

**Change Management**

## Estimated Duration

- **Total:** ~15-30 minutes
- **Critical path:** ~10 minutes (partition + add)
- **Notes:** ZFS operations may vary by pool size

## Communication

- **Before starting:** Notify if production pool
- **After completion:** Verify performance improvement
- **If blocked:** Check NVMe device availability

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Wrong device selected | High | Verify device names carefully |
| Data corruption | Medium | Backup before changes |
| Performance degradation | Low | Test on non-production first |

## Prerequisites

- **System:** Proxmox installed with ZFS RAID-Z
- **Access:** Console/SSH access
- **Backup:** ✅ Backup completed (required)
- **Hardware:** NVMe drive available

## Procedure

### Step 1: Pre-Change Checklist

```bash
# Verify current pool
zpool status

# Verify disks and partitions
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT

# Verify ZFS pool name (likely rpool)
zpool list
```

### Step 2: Add a 4th Partition to ZFS Disks

> Proxmox ZFS install often leaves unused space after initial partitions.

**For Each ZFS Disk:**

```bash
# Example disk
fdisk /dev/sda

# Steps in fdisk:
# n  (new)
# p  (primary)
# 4  (partition number)
# <Enter> (first sector)
# <Enter> (last sector to use remaining space)
# w  (write changes)
```

Repeat for `/dev/sdb`, `/dev/sdc`, etc.

### Step 3: Partition NVMe for Cache + Log

```bash
fdisk /dev/nvme0n1

# Create partition 1 (Cache) ~256G
# n → p → 1 → <Enter> → +256G

# Create partition 2 (Log) ~12G
# n → p → 2 → <Enter> → <Enter>

# Write changes
w
```

### Step 4: Add Cache and Log to ZFS Pool

```bash
# Add cache (L2ARC)
zpool add rpool cache /dev/nvme0n1p1

# Add log (SLOG)
zpool add rpool log /dev/nvme0n1p2

# Verify
zpool status
```

### Step 5: Optional — Disable ZFS Sync (Performance)

> **WARNING:** Increases risk of data loss on power failure.

```bash
zfs set sync=disabled rpool
zfs set sync=disabled mas

# Verify
zfs get sync rpool
```

### Step 6: Verification

```bash
# Confirm cache/log attached
zpool status

# Confirm partitions
lsblk

# Confirm pool health
zpool list
```

## Rollback / Removal

```bash
# Remove cache/log (if needed)
zpool remove rpool /dev/nvme0n1p1
zpool remove rpool /dev/nvme0n1p2

# Verify
zpool status
```

## Success Criteria

- ✅ L2ARC cache visible in `zpool status`
- ✅ SLOG device visible in `zpool status`
- ✅ Pool health shows ONLINE
- ✅ Performance improved (verify with benchmarks)

## Related PKB Guides

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE Storage Guides/Configure ZFS disks after Proxmox Installation]]

## Notes

- L2ARC improves read performance
- SLOG improves synchronous write performance
- NVMe recommended for both
- Sync=disabled increases risk but improves performance

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
