# ZFS Dataset Transfer

## Overview

Transfer ZFS datasets between servers using `zfs send` and `zfs receive`. Common use cases include migration, backup, and load balancing.

## Priority

**P2** — Data integrity critical but not emergency

## Category

**Change Management**

## Prerequisites

- ZFS installed on both source and target servers
- SSH access configured between servers
- Root or sudo permissions on both servers
- Network connectivity verified
- Sufficient disk space on target

## Procedure

### 1. Pre-Transfer Checklist

```bash
# On source: Verify dataset exists
zfs list | grep <dataset_name>

# Check dataset size
zfs list -o name,size,avail <pool>/<dataset>

# On target: Verify sufficient space
zfs list <target_pool>

# Verify SSH connectivity
ssh <target_user>@<target_host> "echo Connection OK"

# Test ZFS on target
ssh <target_user>@<target_host> "zfs list"
```

### 2. Take Snapshot on Source

Create a consistent point-in-time copy.

```bash
# Format: zfs snapshot <pool>/<dataset>@<snapshot_name>

# Example
zfs snapshot rpool/data/vm-111-disk-0@20240307-transfer

# Verify snapshot created
zfs list -t snapshot | grep transfer

# Check snapshot size
zfs list -o name,refreservation rpool/data/vm-111-disk-0@20240307-transfer
```

### 3. Transfer Dataset

Stream snapshot to target via SSH.

```bash
# Full transfer format:
zfs send <pool>/<dataset>@<snapshot> | ssh <user>@<host> zfs receive <target_pool>/<target_dataset>

# Example
zfs send rpool/data/vm-111-disk-0@20240307-transfer | ssh root@bsm1 zfs receive mas/vm-111-disk-0

# With compression (faster over network)
zfs send -c rpool/data/vm-111-disk-0@20240307-transfer | ssh root@bsm1 zfs receive mas/vm-111-disk-0

# With verbose output
zfs send -v rpool/data/vm-111-disk-0@20240307-transfer | ssh root@bsm1 zfs receive -v mas/vm-111-disk-0
```

### 4. Incremental Transfer (if dataset changes)

If data changes between transfers, use incremental:

```bash
# Take new snapshot
zfs snapshot rpool/data/vm-111-disk-0@20240307-transfer2

# Send only changes since previous snapshot
zfs send -i rpool/data/vm-111-disk-0@20240307-transfer \
  rpool/data/vm-111-disk-0@20240307-transfer2 | \
  ssh root@bsm1 zfs receive mas/vm-111-disk-0
```

### 5. Verification

**On target:**

```bash
# Verify dataset exists
zfs list | grep <dataset_name>

# Compare sizes
zfs list -o name,size <source_pool>/<source_dataset>
zfs list -o name,size <target_pool>/<target_dataset>

# Mount and verify content
zfs mount <target_pool>/<target_dataset>
ls -la /mnt/<target_pool>/<target_dataset>/

# Check properties
zfs get all <target_pool>/<target_dataset>
```

## Options Reference

### zfs send Options

| Option | Description |
|--------|-------------|
| `-c` | Compress data stream (saves bandwidth) |
| `-v` | Verbose output |
| `-i <snap>` | Incremental from snapshot |
| `-R` | Include received properties |
| `-I <snap>` | Exclude snapshot from stream |

### zfs receive Options

| Option | Description |
|--------|-------------|
| `-v` | Verbose output |
| `-f` | Force (overwrite existing dataset) |
| `-n` | Dry run (no actual transfer) |
| `-s` | Create snapshot if receiving snapshot |

## Common Issues

### "permission denied"

**Cause:** SSH or ZFS permissions

**Resolution:**

```bash
# Verify SSH key auth works
ssh <user>@<host> "sudo zfs list"

# Or run as root with ssh key
ssh root@<host> "zfs receive <dataset>"
```

### "dataset does not exist"

**Cause:** Target dataset path incorrect or parent missing

**Resolution:**

```bash
# ZFS receive creates parent datasets automatically
# But verify pool exists first
zfs list <target_pool>

# Specify correct path
zfs receive <pool>/<dataset>
```

### "stream error"

**Cause:** Network interruption, insufficient space

**Resolution:**

```bash
# Check network
ping <target_host>

# Check space on target
zfs list -o avail <target_pool>

# Retry transfer
```

### "no sufficient permissions"

**Cause:** User lacks ZFS permissions

**Resolution:**

```bash
# Run as root
sudo zfs send ...

# Or configure ZFS delegated admin
zfs allow user create,mount,send,receive <pool>
```

## Rollback

### On Target (remove transferred dataset)

```bash
# Unmount if mounted
zfs unmount <target_pool>/<target_dataset>

# Destroy dataset
zfs destroy <target_pool>/<target_dataset>

# Verify destroyed
zfs list | grep <dataset>
```

### On Source (remove snapshot after successful transfer)

```bash
# Verify transfer first, then delete snapshot
zfs destroy <pool>/<dataset>@<snapshot>
```

## Best Practices

1. **Always snapshot first** — Ensures consistency
2. **Use compression** over slow networks (`-c`)
3. **Verify before destroying** source data
4. **Document transfers** — Track what moved where
5. **Use incremental** for ongoing sync

## Related Playbooks

- [[proxmox-storage-management.md]] — Proxmox storage operations
- [[proxmox-vm-lxc-migration.md]] — VM/LXC migration

## Notes

- Transfer speed limited by network bandwidth
- Compression helps on slow networks
- Incremental transfers only send changes
- Snapshots can be deleted after successful transfer
