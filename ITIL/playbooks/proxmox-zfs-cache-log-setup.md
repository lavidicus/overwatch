# Proxmox ZFS Cache/Log Setup (Post-Install)

## Overview

Playbook for configuring ZFS after Proxmox install to add NVMe cache (L2ARC) and log (SLOG) devices, based on existing admin guide.

---

## 1) Pre-Change Checklist

### Required

- Proxmox installed with ZFS RAID-Z
- Console/SSH access
- **Backup completed** (required)
- NVMe drive available

```bash
# Verify current pool
zpool status

# Verify disks and partitions
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT

# Verify ZFS pool name (likely rpool)
zpool list
```

---

## 2) Add a 4th Partition to ZFS Disks

> Proxmox ZFS install often leaves unused space after initial partitions.

### For Each ZFS Disk

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

---

## 3) Partition NVMe for Cache + Log

```bash
fdisk /dev/nvme0n1

# Create partition 1 (Cache) ~256G
# n → p → 1 → <Enter> → +256G

# Create partition 2 (Log) ~12G
# n → p → 2 → <Enter> → <Enter>

# Write changes
w
```

---

## 4) Add Cache and Log to ZFS Pool

```bash
# Add cache (L2ARC)
zpool add rpool cache /dev/nvme0n1p1

# Add log (SLOG)
zpool add rpool log /dev/nvme0n1p2

# Verify
zpool status
```

---

## 5) Optional: Disable ZFS Sync (Performance)

> **WARNING:** increases risk of data loss on power failure.

```bash
zfs set sync=disabled rpool
zfs set sync=disabled mas

# Verify
zfs get sync rpool
```

---

## 6) Verification

```bash
# Confirm cache/log attached
zpool status

# Confirm partitions
lsblk

# Confirm pool health
zpool list
```

---

## 7) Rollback / Removal

```bash
# Remove cache/log (if needed)
zpool remove rpool /dev/nvme0n1p1
zpool remove rpool /dev/nvme0n1p2

# Verify
zpool status
```

---

## Related PKB Guides

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE Storage Guides/Configure ZFS disks after Proxmox Installation]]

---

*Created: 2026-03-07 | Priority: P2 | Category: Change Management*
