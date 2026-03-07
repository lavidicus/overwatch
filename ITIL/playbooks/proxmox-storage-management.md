# Proxmox Storage Management

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [proxmox, storage, zfs, lvm, ceph]
---

## Overview

Playbook for managing Proxmox storage operations including adding, removing, and troubleshooting storage.

## Priority

**P2** — Storage operations are important but planned

## Category

**Operations**

## Estimated Duration

- **Total:** ~20-45 minutes
- **Critical path:** ~10 minutes (storage add/verify)
- **Notes:** ZFS operations may take longer

## Communication

- **Before starting:** Notify if storage affects production VMs
- **During:** Update on major operations
- **After:** Document storage changes

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss | High | Backup before operations |
| Storage unmount | Medium | Verify redundancy |
| Performance impact | Medium | Schedule maintenance window |

## Prerequisites

- **Access:** Root or sudo on Proxmox host
- **Storage:** Storage device available
- **Backup:** Current data backed up

## Procedure

### Add Storage

```bash
# Add ZFS storage
pvesm add zfs zfs-storage /dev/disk/by-id/<disk_id>

# Add LVM storage
pvesm add lvm lvm-storage /dev/mapper/<vg_name>

# Add directory storage
pvesm add dir dir-storage /mnt/data

# Add NFS storage
pvesm add nfs nfs-storage <nfs_server>:/<path>

# Add Ceph RBD storage
pvesm add rbd ceph-rbd --crush-location <location>
```

### Remove Storage

```bash
# Remove empty storage
pvesm remove <storage_id>

# Force remove (dangerous)
pvesm remove <storage_id> --force
```

### Check Storage Status

```bash
# List all storage
pvesm status

# Check specific storage
pvesm content <storage_id>

# Check ZFS pool
zpool status

# Check LVM
pvs
vgs
lvs
```

### Resize Storage

```bash
# Extend ZFS dataset
zfs set quota=100G <pool>/<dataset>

# Extend LVM
lvextend -L +10G /dev/mapper/<vg>-<lv>
```

## Verification

```bash
# Storage is listed
pvesm status | grep <storage_id>

# Storage is accessible
pvesm content <storage_id>

# ZFS health
zpool status | grep -q "ONLINE" && echo "ZFS OK"
```

## Common Issues

### Storage Not Mounting

**Symptoms:**
- Storage shows as offline
- VMs won't start

**Resolution:**

```bash
# Check storage configuration
cat /etc/pve/storage.cfg

# Verify device exists
ls -la /dev/disk/by-id/

# Mount manually
mount -t zfs <pool>/<dataset> /mnt/pve/<storage_id>
```

### ZFS Pool Degraded

**Symptoms:**
- "DEGRADED" status
- Missing disks

**Resolution:**

```bash
# Check pool status
zpool status

# Replace failed disk
zpool replace <pool> <failed_disk> <new_disk>

# Scrub pool
zpool scrub <pool>
```

## Rollback

```bash
# Remove newly added storage
pvesm remove <storage_id>

# Restore from backup if needed
vzrestore <vmid> <backup_file>
```

## Related Playbooks

- [[proxmox-vm-lxc-migration.md]] — Migrate VMs to new storage
- [[zfs-dataset-transfer.md]] — ZFS operations

## Notes

- Always backup before storage operations
- ZFS scrub regularly for data integrity
- Monitor storage usage

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
