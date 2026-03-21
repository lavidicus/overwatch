# LVM Storage Expansion on Ubuntu/Proxmox

## Overview

Expand physical disk storage through the LVM stack when the underlying disk has been increased in size but the filesystem hasn't been updated to use the new space.

## When to Use

- After increasing VM disk size in Proxmox
- When adding new storage capacity to a server
- Disk shows larger size but filesystem still reports old capacity
- Running out of disk space and need to expand existing volumes

## Prerequisites

- Root or sudo access to the server
- Physical disk has already been increased (via Proxmox, cloud console, etc.)
- Server is running and accessible
- LVM is being used (most Ubuntu/Debian default installations)

## Quick Summary

```bash
# One-liner for quick expansion
growpart /dev/sda 3 && pvresize /dev/sda3 && lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv && resize2fs /dev/ubuntu-vg/ubuntu-lv
```

## Detailed Procedure

### Step 1: Verify Current State

**Check disk size:**

```bash
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT
```

**Expected output (before expansion):**

```
NAME   SIZE TYPE MOUNTPOINT
sda    512G disk 
├─sda1   1G part /boot/efi
├─sda2   2G part /boot
└─sda3 252.9G part 
  └─lv   252G lvm  /
```

**Check VG free space:**

```bash
vgdisplay
```

Look for "Free PE / Size" - should be 0 before partition extension.

### Step 2: Identify Target Partition

**Find the partition containing your VG:**

```bash
# Show partition table
fdisk -l /dev/sda

# Or find which partition holds the LV
pvs
```

**Typical setup:**
- `/dev/sda1` - EFI boot partition (1GB)
- `/dev/sda2` - Boot partition (2GB)
- `/dev/sda3` - LVM partition (expand this one)

### Step 3: Extend the Partition

**Install growpart if needed:**

```bash
apt install -y cloud-guest-utils
```

**Extend partition to use all available disk space:**

```bash
sudo growpart /dev/sda 3
```

**Verify partition grew:**

```bash
lsblk /dev/sda
```

**Expected output:**

```
CHANGED: partition=3 start=6397952 old: size=530470912 end=536868863 new: size=1067343839 end=1073741790
```

### Step 4: Extend Physical Volume

**Resize PV to recognize new partition size:**

```bash
sudo pvresize /dev/sda3
```

**Verify VG now has free space:**

```bash
vgdisplay ubuntu-vg
```

**Look for:** `Free PE / Size` should now show available space.

### Step 5: Extend Logical Volume

**Extend LV to use all free space in VG:**

```bash
sudo lvextend -l +100%FREE /dev/ubuntu-vg/ubuntu-lv
```

**Alternative: Extend by specific size:**

```bash
# Add 100GB
sudo lvextend -L +100G /dev/ubuntu-vg/ubuntu-lv

# Extend to exact size
sudo lvextend -L 400G /dev/ubuntu-vg/ubuntu-lv
```

**Verify LV size:**

```bash
lvdisplay /dev/ubuntu-vg/ubuntu-lv
```

### Step 6: Resize Filesystem

**For ext4/ext3 filesystems:**

```bash
sudo resize2fs /dev/ubuntu-vg/ubuntu-lv
```

**For XFS filesystems:**

```bash
sudo xfs_growfs /
```

### Step 7: Verify Expansion

**Check final disk layout:**

```bash
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT
```

**Check filesystem usage:**

```bash
df -h /
```

**Expected output (after expansion from 256GB to 512GB):**

```
Filesystem                         Size  Used Avail Use%
/dev/mapper/ubuntu--vg-ubuntu--lv  500G  215G  263G  45%
```

## Verification

```bash
# All disk levels should now reflect new size
lsblk

# VG should have minimal free space (used by LV)
vgdisplay

# LV size should match filesystem size
lvdisplay /dev/ubuntu-vg/ubuntu-lv
df -h /

# Filesystem blocks should match LV size
sudo tune2fs -l /dev/ubuntu-vg/ubuntu-lv | grep "Block count"
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| "growpart: error: can't open /dev/sda" | Device busy or permissions | Use `sudo`, check device exists |
| "No space left on device" | Partition not extended | Verify with `fdisk -l` |
| "PV not found" | Wrong device path | Use `pvs` to find correct path |
| "LV not found" | Wrong VG/LV name | Use `lvs` to list volumes |
| "resize2fs: Device busy" | Filesystem issues | Check with `fsck` (requires unmount) |
| "VG read-only" | VG is frozen/readonly | Check `vgck` and logs |

## Notes

- **growpart** safely extends partitions without data loss
- **pvresize** is required after partition growth
- **lvextend -l +100%FREE** uses all available VG space
- **resize2fs** works on mounted ext filesystems (online)
- **xfs_growfs** required for XFS (cannot shrink)
- Backup before major storage operations when possible
- Operation is reversible by shrinking (more complex, higher risk)

**Common VG/LV names:**

| Distribution | VG Name | LV Name |
|--------------|---------|----------|
| Ubuntu Server | ubuntu-vg | ubuntu-lv |
| Debian | debian-vg | debian-lv |
| CentOS/RHEL | centos | root |
| Proxmox | pve | data |

## Related

- [[ITIL/playbooks/proxmox-storage-management.md]]
- [[pkb/areas/System guides/Linux Operating System/ZFS File System/ZFS File System]]
- [[pkb/areas/System guides/Linux Operating System/Creating Logical Volumes]]

---
**Last Updated:** 2026-03-07
