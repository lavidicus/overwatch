# ZFS Dataset Transfer

## Overview

Transfer ZFS datasets between servers using `zfs send` and `zfs receive`. Ideal for migration, backup, or load balancing.

## When to Use

- Migrating datasets between servers
- Creating offsite backups
- Moving VM/container storage
- Load balancing across pools

## Prerequisites

- ZFS installed on both source and target servers
- SSH access configured between servers
- Root or sudo permissions on both servers
- Sufficient disk space on target

## Quick Summary

```bash
zfs snapshot <pool>/<dataset>@transfer && zfs send <pool>/<dataset>@transfer | ssh root@target zfs receive <target-pool>/<target-dataset>
```

## Detailed Procedure

### Step 1: Pre-Transfer Checklist

Verify source dataset:

```bash
zfs list | grep <dataset_name>
zfs list -o name,size <pool>/<dataset>
```

Verify target space:

```bash
zfs list <target_pool>
```

Test SSH connectivity:

```bash
ssh <user>@<target_host> "echo Connection OK"
```

### Step 2: Create Snapshot on Source

```bash
zfs snapshot <pool>/<dataset>@<snapshot_name>

# Example
zfs snapshot rpool/data/vm-111-disk-0@20260307-transfer
```

Verify snapshot:

```bash
zfs list -t snapshot | grep transfer
```

### Step 3: Transfer Dataset

**Full transfer:**

```bash
zfs send <pool>/<dataset>@<snapshot> | ssh <user>@<host> zfs receive <target_pool>/<target_dataset>

# Example
zfs send rpool/data/vm-111-disk-0@20260307-transfer | ssh root@bsm1 zfs receive mas/vm-111-disk-0
```

**With compression (recommended for slow networks):**

```bash
zfs send -c <pool>/<dataset>@<snapshot> | ssh <user>@<host> zfs receive <target_pool>/<target_dataset>
```

**With verbose output:**

```bash
zfs send -v <pool>/<dataset>@<snapshot> | ssh <user>@<host> zfs receive -v <target_pool>/<target_dataset>
```

### Step 4: Incremental Transfer (Optional)

If data changed after initial transfer:

```bash
# Take new snapshot
zfs snapshot <pool>/<dataset>@transfer2

# Send only changes
zfs send -i <pool>/<dataset>@transfer <pool>/<dataset>@transfer2 | ssh <user>@<host> zfs receive <target_pool>/<target_dataset>
```

### Step 5: Verify on Target

```bash
# Dataset exists
zfs list | grep <dataset_name>

# Compare sizes
zfs list -o name,size <target_pool>/<target_dataset>

# Mount and check content
zfs mount <target_pool>/<target_dataset>
ls -la /mnt/<target_pool>/<target_dataset>/
```

## Verification

```bash
# Confirm dataset on target
zfs list <target_pool>/<target_dataset>

# Check properties
zfs get all <target_pool>/<target_dataset>
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| "permission denied" | SSH or ZFS permissions | Use `ssh root@host` or verify SSH keys |
| "dataset does not exist" | Wrong path or missing parent | Verify pool exists: `zfs list <pool>` |
| "stream error" | Network issue or no space | Check `ping <host>` and `zfs list -o avail <pool>` |

## Notes

- Compression (`-c`) helps on slow networks
- Incremental transfers only send changes
- Snapshots can be deleted after successful transfer
- Transfer speed limited by network bandwidth

## Related

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE Storage Guides/PVE Ceph Maintenance]]
- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE System Configurations/Migrating LXC and VMs between Proxmox Hosts]]

---
**Last Updated:** 2026-03-07
