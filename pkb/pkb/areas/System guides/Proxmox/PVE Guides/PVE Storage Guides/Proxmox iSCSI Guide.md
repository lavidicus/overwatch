# iSCSI Storage in Proxmox

## Overview

Configure iSCSI (Internet Small Computer System Interface) storage in Proxmox VE. Enables accessing remote storage as locally attached disks over IP networks.

## When to Use

- Connecting to NAS/iSCSI target storage
- Expanding storage without local disks
- Centralized storage for VMs/containers
- SAN-like storage over existing network

## Prerequisites

- iSCSI target already configured (NAS, dedicated server, etc.)
- Target IP address known
- Port 3260 accessible from Proxmox host
- CHAP credentials (if authentication required)
- Network connectivity to target

## Quick Summary

```bash
# Scan target
pvesm scan <target-ip>

# Then configure via web UI:
# Datacenter → Storage → Add → iSCSI
```

## Detailed Procedure

### Understanding iSCSI Components

| Component | Description |
|-----------|-------------|
| **Initiator** | Proxmox host (client) |
| **Target** | Storage device/server |
| **Portal** | IP:Port (default 3260) |
| **LUN** | Logical Unit Number (disk identifier) |
| **CHAP** | Challenge Handshake Authentication |

### Step 1: Discover iSCSI Target

**Manual discovery (most common):**

```bash
# Scan target for available LUNs
pvesm scan <target-ip>

# Example
pvesm scan 192.168.1.100
```

**Verify discovery:**

```bash
# Check available storage
pvesm status
```

### Step 2: Configure iSCSI Storage

**Via Web Interface (Recommended):**

1. Navigate to **Datacenter → Storage**
2. Click **Add → iSCSI**

**General Tab:**

| Field | Value |
|-------|-------|
| **Content** | Select storage type (VM disk, Container, ISO, etc.) |
| **ID** | Descriptive name (e.g., `iscsi-nas`) |
| **Target** | IP address of iSCSI target |
| **Port** | 3260 (default) |

**iSCSI Configuration Tab:**

| Field | Value |
|-------|-------|
| **Local Node** | Default (Proxmox hostname) |
| **Initiator** | Default (auto-generated IQN) |
| **Username** | CHAP username (if required) |
| **Password** | CHAP password (if required) |

**Click Create.**

### Step 3: Alternative — Command Line Configuration

```bash
# Create iSCSI storage via CLI
pvesm add iscsi <storage-id> \
  --server <target-ip> \
  --port 3260 \
  --username <chap-user> \
  --password <chap-pass> \
  --content <storage-type>
```

### Step 4: Verify Connection

**Via Web Interface:**

1. Go to **Datacenter → Storage**
2. Select your iSCSI storage
3. Check **Content** tab for available LUNs

**Via CLI:**

```bash
# List all storage
pvesm status

# Check specific storage
pvesm content <storage-id>

# Verify iSCSI sessions
open-iscsi -m node -T <target-ip>
```

### Step 5: Use Storage

**Create VM/Container on iSCSI storage:**

1. Create new VM/Container
2. Select iSCSI storage as disk location
3. Configure as normal

**Migrate existing VM:**

```bash
# Migrate VM disk to iSCSI storage
qm set <vmid> --scsi0 <storage-id>:<size>
qm disk migrate <vmid> <old-disk> <storage-id> --format raw
```

## Verification

```bash
# Storage listed and active
pvesm status | grep <storage-id>

# iSCSI sessions established
cat /proc/scsi/iscsi_helper

# LUNs visible
lsblk | grep -i scsi

# Test write (optional, be careful)
dd if=/dev/zero of=/tmp/testfile bs=1M count=100
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Connection refused" | Target unreachable | `ping <target-ip>`, check firewall |
| "Authentication failed" | Wrong CHAP credentials | Verify username/password on target |
| "Target not found" | Wrong IP or IQN | Verify target IP, check `pvesm scan` output |
| "Storage not appearing" | Not refreshed | Refresh web UI, check `/var/log/syslog` |
| "Slow performance" | Network congestion | Use dedicated network, check link speed |
| "LUN offline" | Target issue | Check target health, restart iSCSI service |

**Debug commands:**

```bash
# Check iSCSI logs
tail -f /var/log/syslog | grep -i iscsi

# Test target connectivity
telnet <target-ip> 3260

# List iSCSI nodes
open-iscsi -m node

# Show iSCSI sessions
open-iscsi -m session
```

## Notes

- Use CHAP authentication for security
- Dedicated network recommended for production
- Port 3260 must be open between initiator and target
- iSCSI over Ethernet can achieve near-SAN performance
- Multipathing available for high availability
- Monitor connection health regularly

## Related

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE Storage Guides/ZFS Dataset Transfer Guide]]
- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE Storage Guides/PVE Ceph Maintenance]]
- [[ITIL/playbooks/proxmox-iscsi-configuration-v2.md]]

---
**Last Updated:** 2026-03-07
