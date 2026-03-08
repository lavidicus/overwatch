# Proxmox VE Cluster Setup - Manual Steps Required

**Status:** Cluster 9XCLAB created on pve-1, but nodes pve-2 and pve-3 need manual joining.

## Current Configuration

**Cluster Name:** 9XCLAB

**IP Address Scheme:**
- Management: 172.16.254.0/24
- Storage/VM: 172.16.253.0/24

**Node IPs:**
- pve-1: 172.16.254.240 (mgmt), 172.16.253.240 (storage)
- pve-2: 172.16.254.241 (mgmt), 172.16.253.241 (storage)
- pve-3: 172.16.254.242 (mgmt), 172.16.253.242 (storage)

## Problem

The `/etc/pve` directory is a cluster filesystem (pmxcfs) that requires:
1. Corosync to be running
2. Proper API authentication to modify
3. Cannot be modified directly via shell commands

The cluster config currently has ring0_addr pointing to 172.16.254.x (management network) instead of 172.16.253.x (storage network).

## Manual Resolution Steps

### Option 1: Use Web UI
1. SSH to pve-1
2. Access https://172.16.253.240:8006
3. Login as root
4. Go to Datacenter → Cluster → Edit
5. Update cluster configuration

### Option 2: Use PVE API via curl
```bash
# Get API ticket
curl -k -c /tmp/cookies.jar -X POST https://localhost:8006/api2/json/access/ticket \
  -H "Accept: application/json" \
  -d "username=root@pam&password=YOUR_ROOT_PASSWORD"

# Update corosync config
curl -k -X PUT https://localhost:8006/api2/json/config/corosync \
  -H "Accept: application/json" \
  -b /tmp/cookies.jar \
  --data-binary '{"cluster_name":"9XCLAB","config_version":1,"nodelist":[{"node":{"name":"pve-1","nodeid":1,"quorum_votes":1,"ring0_addr":"172.16.253.240"}},{"node":{"name":"pve-2","nodeid":2,"quorum_votes":1,"ring0_addr":"172.16.253.241"}},{"node":{"name":"pve-3","nodeid":3,"quorum_votes":1,"ring0_addr":"172.16.253.242"}}]}'
```

### Option 3: Rebuild Cluster
⚠️ **WARNING:** This will delete all existing VM/container configs

1. Stop corosync on all nodes
2. Backup /etc/pve (if possible)
3. Delete cluster config
4. Recreate cluster with correct network
5. Rejoin nodes

## Files Created

- `/home/localadmin/.openclaw/workspace/scripts/corosync.conf` - Template config
- `/home/localadmin/.openclaw/workspace/scripts/corosync-172-16-253.conf` - Corrected config

## Next Steps

1. Manually update the cluster configuration using one of the options above
2. Restart corosync: `systemctl restart corosync`
3. Join pve-2: `pvecm add 172.16.253.240`
4. Join pve-3: `pvecm add 172.16.253.240`
5. Verify cluster: `pvecm nodes`
