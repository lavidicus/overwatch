# Proxmox Ceph Cluster Setup Playbook

**Created:** 2026-03-08  
**Author:** Sam (Sam)  
**Cluster Name:** VTE  
**Nodes:** pve-1, pve-2, pve-3  
**Network:** 172.16.253.0/24 (ens19)

---

## Overview

This playbook documents the complete setup of a Proxmox VE Ceph cluster with:
- 3-node hyper-converged architecture
- 3 OSDs (one 50GB disk per node)
- 1 monitor (expandable to 3 for HA)
- RBD storage pool for VM/container disk images

---

## Prerequisites

### Hardware
- 3x Proxmox VE nodes (identical specs recommended)
- 1x 50GB disk per node for Ceph OSDs
- Network connectivity on `172.16.253.0/24`

### Software
- Proxmox VE 8.x installed and clustered
- Ceph packages installed on all nodes:
  ```bash
  apt update && apt install pve-ceph-cluster -y
  ```

### SSH Access
- Root access via `~/.ssh/id_rsa` to all nodes

---

## Step-by-Step Setup

### Step 1: Identify Available Disks

On each node, identify the disk to use for OSDs:

```bash
lsblk -o NAME,SIZE,TYPE,MOUNTPOINT | grep -E "sd|nvme"
```

**Expected Output:**
```
sda                  25G disk        # OS disk (do not use)
├─sda1             1007K part
├─sda2              512M part /boot/efi
└─sda3             24.5G part
sdb                  50G disk        # ← Use this for OSD
```

**Disk Assignment:**
| Node | Disk | Size |
|------|------|------|
| pve-1 | /dev/sdb | 50GB |
| pve-2 | /dev/sda | 50GB |
| pve-3 | /dev/sdb | 50GB |

---

### Step 2: Initialize Ceph Cluster

On **pve-1 only**, initialize the Ceph cluster:

```bash
ssh -i ~/.ssh/id_rsa root@pve-1 'pveceph init --network 172.16.253.0/24'
```

**What this does:**
- Creates `/etc/pve/ceph.conf` with cluster configuration
- Distributes config to all cluster nodes via pmxcfs
- Generates admin keyring: `/etc/pve/priv/ceph.client.admin.keyring`
- Sets `fsid = 6f5acc11-e970-43ba-a260-d8e6f8f4da54`

**Network Parameter:** The `--network` parameter expects a **CIDR network** (e.g., `172.16.253.0/24`), not an IP address.

---

### Step 3: Create First Monitor

On **pve-1**, create the initial monitor daemon:

```bash
ssh -i ~/.ssh/id_rsa root@pve-1 'pveceph mon create'
```

**What this does:**
- Creates monitor keyring: `/etc/pve/priv/ceph.mon.keyring`
- Generates monmap with first monitor
- Enables `ceph-mon@pve-1.service`
- Enables `ceph-mgr@pve-1.service`

---

### Step 4: Create OSDs

#### 4a: Prepare Disk on pve-2

pve-2's disk (`/dev/sda`) needs to be zapped before OSD creation:

```bash
ssh -i ~/.ssh/id_rsa root@pve-2 'ceph-volume lvm zap /dev/sda --destroy'
```

#### 4b: Create OSDs on All Nodes

**On pve-1:**
```bash
ssh -i ~/.ssh/id_rsa root@pve-1 'pveceph osd create /dev/sdb'
```

**On pve-2:**
```bash
ssh -i ~/.ssh/id_rsa root@pve-2 'pveceph osd create /dev/sda'
```

**On pve-3:**
```bash
ssh -i ~/.ssh/id_rsa root@pve-3 'pveceph osd create /dev/sdb'
```

**What this does:**
- Wipes disk and creates partition/LVM structure
- Creates volume group: `ceph-XXXX`
- Creates logical volume for OSD block device
- Generates OSD keyring and activates OSD daemon
- Starts `ceph-osd@N.service`

---

### Step 5: Verify Cluster Status

Check cluster health on any node:

```bash
ssh -i ~/.ssh/id_rsa root@pve-1 'pveceph status'
```

**Expected Output:**
```
cluster:
    id:     6f5acc11-e970-43ba-a260-d8e6f8f4da54
    health: HEALTH_OK
 
  services:
    mon: 1 daemons, quorum pve-1
    mgr: pve-1(active)
    osd: 3 osds: 3 up, 3 in
 
  data:
    pools:   0 pools, 0 pgs
    objects: 0 objects, 0 B
    usage:   53 MiB used, 100 GiB / 100 GiB avail
```

---

### Step 6: Create RBD Storage Pool

Create a replicated pool for VM/container storage:

```bash
ssh -i ~/.ssh/id_rsa root@pve-1 'pveceph pool create rbd --add_storages'
```

**What this does:**
- Creates Ceph pool named `rbd`
- Configures with default settings:
  - `size = 3` (3 replicas)
  - `min_size = 2` (minimum replicas for I/O)
  - `pg_num = 128` (placement groups)
- Registers storage in Proxmox VE (`pvesm add rbd rbd`)

**Verify Storage:**
```bash
ssh -i ~/.ssh/id_rsa root@pve-1 'pvesm status'
```

**Expected Output:**
```
Name             Type     Status     Total (KiB)      Used (KiB) Available (KiB)
rbd               rbd     active        49776384               0        49776384
```

---

### Step 7: (Optional) Add Monitors for HA

For high availability, add monitors to pve-2 and pve-3:

```bash
ssh -i ~/.ssh/id_rsa root@pve-2 'pveceph mon create'
ssh -i ~/.ssh/id_rsa root@pve-3 'pveceph mon create'
```

**Verify Quorum:**
```bash
ssh -i ~/.ssh/id_rsa root@pve-1 'ceph mon dump'
```

---

## Post-Setup Configuration

### Network Considerations

**Ceph Public/Cluster Network:** `172.16.253.0/24`
- Used for: OSD replication, monitor heartbeat, client access
- Ensure firewalls allow:
  - TCP 6789 (monitor)
  - TCP 3300 (cluster)
  - TCP 80 (mgr dashboard)
  - TCP 6800-7300 (OSD)

### Storage Usage

**Raw Capacity:** 150 GB (3 × 50 GB)  
**Usable Capacity:** ~66-100 GB (depending on replication factor)

With `size=3` and `min_size=2`:
- All data replicated 3x across nodes
- Cluster survives 1 node failure
- I/O blocked if <2 replicas available

---

## Troubleshooting

### Issue: OSD not starting

**Check status:**
```bash
systemctl status ceph-osd@0
journalctl -u ceph-osd@0 -n 50
```

**Common causes:**
- Disk already has Ceph signature (run `ceph-volume lvm zap`)
- Insufficient memory (OSD requires ~4GB per OSD)
- Network connectivity issues

### Issue: Cluster health = WARN

**Check PG status:**
```bash
ceph pg stat
ceph pg dump
```

**Rebalance OSDs:**
```bash
ceph osd rebalance
```

### Issue: "RADOS object not found"

**Create symlink on client nodes:**
```bash
ln -sf /etc/pve/ceph.conf /etc/ceph/ceph.conf
```

### Issue: "network: invalid format"

**Use CIDR notation:**
```bash
# ❌ Wrong
pveceph init --network 172.16.253.240

# ✅ Correct
pveceph init --network 172.16.253.0/24
```

---

## Cleanup Commands

### Remove OSD
```bash
pveceph osd destroy <osd-id> --cleanup
```

### Remove Pool
```bash
pveceph pool destroy rbd --remove_storages
```

### Destroy Cluster
```bash
pveceph destroy --yes-i-really-mean-it
```

---

## References

- [Proxmox VE Ceph Documentation](https://pve.proxmox.com/wiki/Deploy_Hyper-Converged_Ceph_Cluster)
- [Ceph Documentation](https://docs.ceph.com/)
- [Proxmox Forum](https://forum.proxmox.com/)

---

## Revision History

| Date | Author | Change |
|------|--------|--------|
| 2026-03-08 | Sam | Initial playbook created |

---

*This playbook is auto-generated from live cluster setup. Verify commands before production use.*
