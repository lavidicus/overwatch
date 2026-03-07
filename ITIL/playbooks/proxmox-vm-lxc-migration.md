# Proxmox VM/LXC Migration

## Overview

Playbook for migrating VMs and LXC containers between Proxmox nodes, including forced storage placement and rollback procedures.

---

## 1) Pre-Migration Checklist

### Verify Cluster Status

```bash
# Check cluster quorum
pvecm status

# List cluster nodes
pvecm nodes

# Expected output:
# quorum: 1
# expected votes: 2
# total votes: 2
```

### Check Target Node Storage

```bash
# List all storage on target node
pvesm status

# Check specific storage details
pvesm content <storage_id>

# Verify ZFS pool exists
zpool status <pool_name>

# Check available space
zfs list -t filesystem -o name,available,used <pool_name>
```

### Identify Workload to Migrate

```bash
# List VMs on source node
qm list -node <source_node>

# List LXC containers on source node
pct list -node <source_node>

# Get VM details
qm config <vmid>

# Get container details
pct config <ctid>
```

---

## 2) LXC Container Migration

### Standard Migration

```bash
# Run on SOURCE node

# Migrate with automatic restart
pct migrate <ctid> <target_node> --restart

# Example:
pct migrate 105 mas --restart

# Migrate without restart (manual start on target)
pct migrate <ctid> <target_node>

# Migrate with specific timeout
pct migrate <ctid> <target_node> --timeout 3600
```

### Migration to Specific Storage (Critical!)

```bash
# Run on SOURCE node

# Migrate and force storage placement
pct migrate <ctid> <target_node> --restart --target-storage <storage_id>

# Example: Force to 'mas' ZFS pool
pct migrate 105 mas --restart --target-storage mas

# What this does:
# - Stops the container
# - Copies data over SSH
# - Creates rootfs on specified storage
# - Starts container on target node
```

### Migration Options

```bash
# Live migration (if shared storage)
pct migrate <ctid> <target_node> --online

# With mount points
pct migrate <ctid> <target_node> --mount-all

# Copy mode (creates duplicate)
pct migrate <ctid> <target_node> --clone
```

---

## 3) VM Migration

### Standard Migration

```bash
# Run on SOURCE node

# Migrate VM
qm migrate <vmid> <target_node>

# Example:
qm migrate 210 mas

# Live migration (requires shared storage)
qm migrate <vmid> <target_node> --online
```

### Migration with Local Disks

```bash
# Migrate with local disk copy
qm migrate <vmid> <target_node> --with-local-disks

# Example:
qm migrate 210 mas --with-local-disks
```

### Migration to Specific Storage (Critical!)

```bash
# Migrate and force disk placement
qm migrate <vmid> <target_node> --with-local-disks --targetstorage <storage_id>

# Example: Force all disks to 'mas' pool
qm migrate 210 mas --with-local-disks --targetstorage mas

# What this does:
# - Stops or live-migrates the VM
# - Copies local disks
# - Places disks on specified storage
```

### Migration Options

```bash
# Set migration speed limit
qm migrate <vmid> <target_node> --migrate-disk-speed 50

# Use specific compression
qm migrate <vmid> <target_node> --compress zstd

# Verify checksums after transfer
qm migrate <vmid> <target_node> --verify
```

---

## 4) Post-Migration Verification

### Verify LXC Placement

```bash
# Run on TARGET node

# Check container config
pct config <ctid> | grep rootfs

# Expected output:
# rootfs: mas:subvol-105-disk-0

# Verify in ZFS
zfs list | grep <ctid>

# Check container status
pct status <ctid>

# Verify container running
pct list | grep <ctid>
```

### Verify VM Placement

```bash
# Run on TARGET node

# Check VM disk configuration
qm config <vmid> | grep -E "scsi|virtio|ide|sata"

# Expected output:
# scsi0: mas:vm-210-disk-0,size=50G

# Verify in ZFS
zfs list | grep vm-<vmid>

# Check VM status
qm status <vmid>

# Verify VM running
qm list | grep <vmid>
```

### Functional Verification

```bash
# Test console access
# Web UI → VM/CT → Console

# Test network connectivity from inside VM/CT
# ping 8.8.8.8
# ping google.com

# Verify services running
# Check application services
# Verify database connections
```

---

## 5) Fix Wrong Storage Placement

### If LXC Landed on Wrong Storage

```bash
# Run on TARGET node

# Move container to correct storage
pct move-volume <ctid> rootfs <correct_storage>

# Example:
pct move-volume 105 rootfs mas

# Verify move completed
pct config <ctid> | grep rootfs

# This is safe and fully supported
```

### If VM Landed on Wrong Storage

```bash
# Run on TARGET node

# Stop VM first
qm stop <vmid>

# Move disk to correct storage
qm move-disk <vmid> <disk_id> <correct_storage>

# Example:
qm move-disk 210 scsi0 mas

# Verify move
qm config <vmid> | grep scsi0

# Start VM
qm start <vmid>
```

---

## 6) Rollback Procedures

### Rollback LXC Migration

```bash
# If migration failed, migrate back
pct migrate <ctid> <original_node> --restart

# If you need to restore from backup
vzdump --restore <backup_file> --storage <storage_id>
```

### Rollback VM Migration

```bash
# If migration failed, migrate back
qm migrate <vmid> <original_node>

# If you need to restore from backup
vzdump --restore <backup_file> --storage <storage_id>
```

---

## 7) Migration Failures

### Common Errors

#### "No route to host"

```bash
# Check SSH connectivity between nodes
ssh <target_node> hostname

# Verify corosync/authkeys
pvecm auth <target_node>
```

#### "Not enough space"

```bash
# Check target storage space
pvesm status

# Free up space or choose different storage
zfs list -o name,available,used
```

#### "VM/CT is running" (when it shouldn't be)

```bash
# Check status on both nodes
qm status <vmid>
pct status <ctid>

# Force stop if needed
qm reset <vmid>
pct destroy <ctid>

# Clean up stale locks
rm -f /var/lock/pve/qm-<vmid>.lock
rm -f /var/lock/pve/pct-<ctid>.lock
```

### Interrupted Migration Recovery

```bash
# Check if VM/CT exists on both nodes
qm list
pct list

# If on wrong node, migrate back
qm migrate <vmid> <correct_node>

# Clean up partial migration files
# On source node:
rm -rf /var/lib/vz/tmp/<vmid>_*

# On target node:
rm -rf /var/lib/vz/tmp/<vmid>_*
```

---

## 8) Best Practices

### Pre-Migration

- [ ] Create backup before migration
- [ ] Verify cluster quorum
- [ ] Check target storage space
- [ ] Schedule maintenance window
- [ ] Notify stakeholders

### During Migration

- [ ] Monitor migration progress
- [ ] Have rollback plan ready
- [ ] Keep console access available
- [ ] Watch for timeout issues

### Post-Migration

- [ ] Verify storage placement
- [ ] Test functionality
- [ ] Update documentation
- [ ] Update monitoring targets
- [ ] Update backup configurations

---

## Related PKB Guides

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE System Configurations/Migrating LXC and VMs between Proxmox Hosts]]

---

*Created: 2026-03-07 | Priority: P2 | Category: Change Management*
