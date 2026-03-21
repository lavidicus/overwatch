# LXC and VM Migration Between Proxmox Hosts

## Overview

Migrate LXC containers or VMs from one Proxmox node to another, ensuring disks are placed on the correct storage pool (e.g., `mas` pool instead of default `rpool`).

## When to Use

- Load balancing across cluster nodes
- Hardware maintenance or upgrades
- Reorganizing storage allocation
- Moving workloads to faster storage

## Prerequisites

- Source and target nodes in same Proxmox cluster
- Cluster is quorate
- Target node has destination storage configured
- Sufficient free space on target storage
- SSH connectivity between nodes

## Quick Summary

```bash
# LXC migration
pct migrate <CTID> <target-node> --restart --target-storage <storage>

# VM migration with local disks
qm migrate <VMID> <target-node> --with-local-disks --targetstorage <storage>
```

## Detailed Procedure

### Pre-Migration Checklist

**Verify cluster status:**

```bash
# Check cluster quorum
pvecm status

# Verify target node online
pvecm nodes

# List available storage on target
pvesm status
```

**Check available space:**

```bash
# On target node
zfs list | grep mas
df -h
```

### LXC Container Migration

**List containers on source:**

```bash
pct list
```

**Migrate to target with specific storage:**

```bash
# Syntax
pct migrate <CTID> <target-node> --restart --target-storage <storage>

# Example: Migrate container 105 to node MAS, storage mas
pct migrate 105 mas --restart --target-storage mas
```

**What happens:**

1. Container stops on source
2. Data copies over SSH
3. Rootfs created on target storage
4. Container starts on target

### VM Migration

**List VMs on source:**

```bash
qm list
```

**Migrate with local disks:**

```bash
# Syntax
qm migrate <VMID> <target-node> --with-local-disks --targetstorage <storage>

# Example: Migrate VM 210 to node MAS, storage mas
qm migrate 210 mas --with-local-disks --targetstorage mas
```

**What happens:**

1. VM stops (or live-migrates if shared storage)
2. Local disks copied to target
3. Disks placed on specified storage
4. VM configured on target

### Post-Migration Verification

**LXC verification:**

```bash
# Container config shows correct storage
pct config <CTID> | grep rootfs

# Expected output:
# rootfs: mas:subvol-<CTID>-disk-0

# ZFS dataset exists
zfs list | grep <CTID>

# Container running on target
pct status | grep <CTID>
```

**VM verification:**

```bash
# Disk configuration
qm config <VMID> | grep -E "scsi|virtio|ide|sata"

# Expected: scsi0: mas:vm-<VMID>-disk-0

# ZFS dataset exists
zfs list | grep vm-<VMID>

# VM running
qm status | grep <VMID>
```

### Fix: Wrong Storage Allocation

**If container/VM landed on wrong storage:**

```bash
# LXC: Move rootfs to correct storage
pct move-volume <CTID> rootfs <correct-storage>

# VM: Move disk to correct storage
qm disk move <VMID> <disk-id> <correct-storage>

# Example
pct move-volume 105 rootfs mas
```

## Verification

```bash
# All containers on expected node
pct list -node

# All VMs on expected node
qm list -node

# Storage usage on target
pvesm status

# ZFS datasets on target
zfs list | grep -E "vm-|subvol-"
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| "node not found" | Wrong node name | Check with `pvecm nodes` |
| "storage not found" | Storage not configured | Add via web UI or `pvesm add` |
| "not enough space" | Target storage full | Free space or use different storage |
| "cluster not quorate" | Cluster communication issue | Check `pvecm status` |
| Migration slow | Network bottleneck | Use dedicated migration network |

## Notes

- `--restart` flag required for LXC storage migration
- `--with-local-disks` required for VMs with local storage
- Live migration only works with shared storage
- Migration uses SSH internally between nodes
- Network performance affects migration speed
- Test migration during maintenance window first

## Related

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE Storage Guides/ZFS Dataset Transfer Guide]]
- [[ITIL/playbooks/proxmox-vm-lxc-migration-v2.md]]
- [[ITIL/playbooks/proxmox-ha-cluster-v2.md]]

---
**Last Updated:** 2026-03-07
