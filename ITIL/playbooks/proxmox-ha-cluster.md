# Proxmox High Availability Cluster

## Overview

Configure, manage, and troubleshoot Proxmox VE High Availability (HA) clusters for automatic VM/container failover and resource management.

---

## 1) Prerequisites for HA Cluster

### Hardware Requirements

- **Minimum:** 3 nodes (for quorum)
- **Network:** Dedicated heartbeat network (optional but recommended)
- **Storage:** Shared storage (Ceph, NFS, iSCSI) for VM images
- **Time:** NTP synchronized across all nodes

### Software Requirements

- Proxmox VE 8.x on all nodes
- Corosync installed
- Pacemaker installed
- Shared storage accessible by all nodes

---

## 2) Create HA Cluster

### Install Required Packages

```bash
# On all nodes
sudo apt-get install corosync pacemaker pbs-cluster
```

### Configure Cluster Name

```bash
# Set cluster name (all nodes)
sudo vim /etc/corosync/corosync.conf
```

Add:
```bash
totem {
    version: 2
    cluster_name: proxmox-ha
    transport: udpu
}

nodelist {
    node {
        ring0_addr: 192.168.10.101
        nodeid: 1
    }
    node {
        ring0_addr: 192.168.10.102
        nodeid: 2
    }
    node {
        ring0_addr: 192.168.10.103
        nodeid: 3
    }
}
```

### Join Cluster

```bash
# On first node (initiate cluster)
sudo pvecm create proxmox-ha

# On other nodes (join cluster)
sudo pvecm add 192.168.10.101
```

### Verify Cluster

```bash
# Check cluster status
corosync-cmapctl

# View cluster membership
pvesh get /cluster/cluster/status

# Check quorum
cat /proc/fs/cluster/quorum
```

---

## 3) Configure HA Resources

### Enable HA on Cluster

```bash
# Enable HA manager
pvesh create /cluster/handler \
  --handler ha-manager \
  --enable 1
```

### Add VM to HA

```bash
# Add VM 100 to HA
pvesh create /cluster/handler \
  --handler ha-manager \
  --vmid 100 \
  --ha-group production \
  --ha-state master \
  --ha-max 2 \
  --ha-migrate 1

# Or via web interface:
# Datacenter → HA → Add
```

### Configure HA Group

```bash
# Create HA group
pvesh create /cluster/handler \
  --handler ha-manager \
  --group production \
  --max-restarts 3 \
  --restart-timeout 300
```

### Set HA Priority

```bash
# Set VM priority (1 = highest, 100 = lowest)
pvesh create /cluster/handler \
  --handler ha-manager \
  --vmid 100 \
  --priority 1

# List HA resources
pvesh get /cluster/handler/ha-resources
```

---

## 4) Configure Shared Storage

### Configure Ceph for HA

```bash
# Create Ceph pool
pvesh create /ceph/pools \
  --name ha-pool \
  --pools 3 \
  --pg_num 64

# Add Ceph storage
pvesh create /nodes/$(hostname)/storage \
  --type ceph \
  --id ceph-ha \
  --cephpool ha-pool \
  --cephuser cephadmin \
  --cluster ceph
```

### Configure NFS for HA

```bash
# On NFS server
sudo mkdir -p /srv/nfs/proxmox-ha
sudo chown root:root /srv/nfs/proxmox-ha

# Add to /etc/exports
/srv/nfs/proxmox-ha 192.168.10.0/24(rw,sync,no_root_squash)

# On Proxmox nodes
pvesm add nfs nfs-ha \
  --server 192.168.10.50 \
  --export /srv/nfs/proxmox-ha \
  --content images,rootdir
```

---

## 5) Monitor HA Cluster

### Check HA Status

```bash
# HA resource status
pvesh get /cluster/handler/ha-resources

# Detailed status
pvesh get /cluster/handler/ha-resources --output-format json | jq '.[] | {id, state, group}'
```

### Monitor Node Status

```bash
# Cluster node status
pvesh get /cluster/nodes

# Corosync status
corosync-cfgtool -s

# Pacemaker status
crm_mon -1
```

### Check HA Failover History

```bash
# HA events log
journalctl -u pbs-cluster -n 100

# Failover events
grep -i "ha\|failover" /var/log/pve/tasks/log | tail -50
```

---

## 6) Perform HA Failover

### Manual Failover

```bash
# Move VM 100 to different node
pvesh create /cluster/handler \
  --handler ha-manager \
  --vmid 100 \
  --target node2

# Or via web interface:
# HA → VM 100 → Migrate
```

### Force Failover

```bash
# Force HA to restart on different node
pvesh create /cluster/handler \
  --handler ha-manager \
  --vmid 100 \
  --action failover
```

### Test Failover

```bash
# Simulate node failure
pvesh create /cluster/nodes/$(hostname)/shutdown

# Verify VM moves to other node
pvesh get /cluster/handler/ha-resources | grep vmid=100
```

---

## 7) Troubleshoot HA Issues

### Check HA Resource State

```bash
# Detailed resource info
pvesh get /cluster/handler/ha-resources/vmid/100

# Check if resource is active
pvesh get /cluster/handler/ha-resources/vmid/100/state
```

### Investigate Failover

```bash
# Check why VM failed over
journalctl -u pbs-cluster -n 200 | grep -i "vmid=100\|failover"

# Check resource constraints
pvesh get /cluster/handler/ha-resources/vmid/100/limits
```

### Verify Quorum

```bash
# Check cluster quorum
cat /proc/fs/cluster/quorum

# View quorum status
pvesh get /cluster/status

# Check for split-brain
corosync-cmapctl | grep -i quorum
```

### Check Resource Conflicts

```bash
# Check for resource conflicts
pvesh get /cluster/handler/ha-resources --all

# View resource constraints
pvesh get /cluster/handler/ha-resources/vmid/100/constraints
```

---

## 8) Configure HA Failover Rules

### Set Resource Constraints

```bash
# VM can only run on specific nodes
pvesh create /cluster/handler/ha-resources/vmid/100/constraints \
  --colocation colocation-vms \
  --score INFINITY \
  --node node1,node2

# VM should not run on same node
pvesh create /cluster/handler/ha-resources/vmid/100/constraints \
  --colocation colocation-vms \
  --score -INFINITY \
  --node node1,node1
```

### Configure Restart Priority

```bash
# Set restart priority for VM
pvesh create /cluster/handler/ha-resources/vmid/100/constraints \
  --order order-vms \
  --score INFINITY \
  --first vmid/100 \
  --then vmid/101
```

---

## 9) HA Group Management

### Create HA Group

```bash
# Create group for related VMs
pvesh create /cluster/handler \
  --handler ha-manager \
  --group production \
  --max-restarts 3 \
  --restart-timeout 300 \
  --ha-state master
```

### Add VMs to Group

```bash
# Add multiple VMs
for vmid in 100 101 102; do
  pvesh create /cluster/handler \
    --handler ha-manager \
    --vmid $vmid \
    --ha-group production
done
```

### Remove VM from Group

```bash
# Remove VM from HA
pvesh delete /cluster/handler/ha-resources/vmid/100
```

---

## 10) Success Criteria

- ✅ Cluster has quorum (3/3 nodes)
- ✅ All HA resources show as "master" or "backup"
- ✅ Failover works when node fails
- ✅ No resource conflicts or constraints violations
- ✅ HA monitoring shows no errors

---

## 11) Escalation Data to Collect

If HA issues persist:

1. **Cluster status:**
   ```bash
   pvesh get /cluster/status
   pvesh get /cluster/handler/ha-resources
   ```

2. **Corosync/Pacemaker logs:**
   ```bash
   journalctl -u corosync -n 200
   journalctl -u pacemaker -n 200
   ```

3. **HA resource details:**
   ```bash
   pvesh get /cluster/handler/ha-resources/vmid/100 --output-format json
   ```

4. **Node status:**
   ```bash
   pvesh get /cluster/nodes
   ```

5. **Failover history:**
   ```bash
   grep -i "failover\|ha" /var/log/pve/tasks.log
   ```

---

**Owner:** Sam (ops butler AI)  
**Last Updated:** 2026-03-05 04:21 UTC  
**Status:** Ready for deployment