---
Title: LVM Storage Expansion
Author: Sam
Created: 2026-03-07
Last Updated: 2026-03-07
Version: 1.0
Tags: [storage, lvm, expansion, ubuntu, proxmox]
---

# LVM Storage Expansion

## Overview

Expand storage capacity when physical disk has been increased but filesystem hasn't been updated. This procedure walks through the complete LVM stack expansion from partition through filesystem.

## Priority

| Field | Value |
|--------|-------|
| **Type** | Change |
| **Priority** | P2 |
| **Category** | Storage Operations |

## Estimated Duration

| Phase | Time |
|-------|------|
| Total | 5-10 minutes |
| Critical Path | 2-3 minutes |
| Verification | 2-5 minutes |

**Notes:** Minimal downtime required. Filesystem can be resized online.

## Communication

| Timing | Audience | Message |
|--------|----------|---------|
| Before | Team | "Expanding storage on [host] from X to Y GB" |
| During | — | No notification needed |
| After | Team | "Storage expansion complete on [host], now at Y GB" |

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during partition resize | Critical | `growpart` is safe; backup recommended |
| Filesystem corruption | Critical | ext4 resize is online/safe; XFS also safe |
| Service interruption | Low | Minimal I/O pause during operations |
| Rollback complexity | Medium | Shrinking is riskier than expanding |

## Prerequisites

- [ ] Physical disk already increased (Proxmox/cloud console)
- [ ] Root or sudo access to target server
- [ ] Server accessible via SSH or console
- [ ] Current storage state documented
- [ ] Backup completed (recommended)

## Procedure

### Step 1: Verify Current State

```bash
# Check disk layout
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT

# Check VG free space
vgdisplay

# Check current usage
df -h /
```

**Expected (before):** Disk shows new size, partition shows old size.

### Step 2: Identify Target Partition

```bash
# Find partition table
fdisk -l /dev/sda

# Find which partition holds your LV
pvs
```

**Typical Ubuntu/Proxmox setup:**
- `/dev/sda1` - EFI (1GB)
- `/dev/sda2` - Boot (2GB)
- `/dev/sda3` - LVM partition ← **expand this**

### Step 3: Extend Partition

```bash
# Install growpart if needed
apt install -y cloud-guest-utils

# Extend partition 3 on /dev/sda
sudo growpart /dev/sda 3

# Verify
lsblk /dev/sda
```

**Expected output:**
```
CHANGED: partition=3 old: size=530470912 new: size=1067343839
```

### Step 4: Extend Physical Volume

```bash
# Resize PV to recognize new partition size
sudo pvresize /dev/sda3

# Verify VG has free space
vgdisplay ubuntu-vg
```

**Look for:** `Free PE / Size` now shows available space.

### Step 5: Extend Logical Volume

```bash
# Extend LV to use all free space
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv

# Alternative: specific size
# sudo lvextend -L +100G /dev/ubuntu-vg/ubuntu-lv

# Verify
lvdisplay /dev/ubuntu-vg/ubuntu-lv
```

### Step 6: Resize Filesystem

**For ext4/ext3:**

```bash
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv
```

**For XFS:**

```bash
sudo xfs_growfs /
```

### Step 7: Verify Expansion

```bash
# Disk layout
lsblk

# Filesystem usage
df -h /

# Should show new capacity
```

**Expected (after 256→512GB expansion):**
```
Filesystem                         Size  Used Avail Use%
/dev/mapper/ubuntu--vg-ubuntu--lv  500G  215G  263G  45%
```

## Verification

```bash
# All levels reflect new size
lsblk

# VG minimal free space
vgdisplay

# LV matches filesystem
lvdisplay /dev/ubuntu-vg/ubuntu-lv
df -h /
```

## Common Issues

| Symptom | Solution |
|---------|----------|
| "growpart: can't open device" | Check permissions, use sudo |
| "No space left" | Partition not extended, check `fdisk -l` |
| "PV/LV not found" | Use `pvs`/`lvs` to find correct names |
| "resize2fs: Device busy" | Check filesystem health with `fsck` |

## Rollback

⚠️ **Shrinking storage is higher risk. Only if absolutely necessary.**

```bash
# 1. Backup data first!
# 2. Unmount filesystem
umount /

# 3. Check filesystem
fsck -f /dev/ubuntu-vg/ubuntu-lv

# 4. Shrink filesystem (ext4 only, XFS cannot shrink)
resize2fs /dev/ubuntu-vg/ubuntu-lv 250G

# 5. Shrink LV
lvreduce -L 250G /dev/ubuntu-vg/ubuntu-lv

# 6. Shrink PV
pvresize /dev/sda3

# 7. Shrink partition (requires parted)
parted /dev/sda resizepart 3 255G
```

## Related Playbooks

- [[proxmox-storage-management.md]]
- [[proxmox-backup-restore.md]]
- [[zfs-dataset-transfer.md]]

## Notes

- Operation performed on **olla** host on 2026-03-07
- Expanded from **256GB → 512GB** physical disk
- Usable space: **252GB → 500GB**
- Commands executed in order: growpart → pvresize → lvextend → resize2fs
- All operations completed successfully, no service interruption

## Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-07 | Sam | Initial playbook created from ola storage expansion |
