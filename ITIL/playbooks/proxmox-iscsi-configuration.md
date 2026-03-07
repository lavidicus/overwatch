# Proxmox iSCSI Configuration

## Overview

iSCSI allows Proxmox VE to access remote block storage over IP networks. This playbook covers discovery, configuration, authentication, and troubleshooting.

## Priority

**P2** — Storage connectivity affects VM/LXC availability

## Category

**Change Management**

## Concepts

- **Initiator:** Proxmox host
- **Target:** Storage server/NAS
- **Portal:** Target IP:3260
- **LUN:** Presented block device
- **CHAP:** Authentication for access control

## Prerequisites

- iSCSI target configured (NAS or storage server)
- Target IP and LUNs available
- Network connectivity from Proxmox to target
- CHAP credentials (if enabled)

## Procedure

### 1. Discover iSCSI Target

```bash
# Scan target for LUNs
pvesm scan <target_ip>

# Example
pvesm scan 10.50.21.25
```

### 2. Add iSCSI Storage in Proxmox

**Via Web UI:**

1. Datacenter → **Storage** → **Add** → **iSCSI**
2. **General**
   - ID: `iscsi-storage`
   - Portal: `<target_ip>`
   - Port: `3260`
3. **iSCSI**
   - Target: auto-discovered (select)
   - CHAP user/password if required
4. Click **Create**

**Via CLI (optional):**

```bash
# List detected targets
iscsiadm -m discovery -t sendtargets -p <target_ip>

# Add storage via pvesm
pvesm add iscsi iscsi-storage --portal <target_ip> --target <iqn>
```

### 3. Verify Connection

```bash
# Check storage list
pvesm status

# Check iSCSI sessions
iscsiadm -m session

# Verify target availability
iscsiadm -m node
```

## Common Issues

### Target Not Found

**Cause:** Wrong IP, firewall blocking, target service down

**Resolution:**

```bash
# Check connectivity
ping <target_ip>

# Check port 3260
nc -zv <target_ip> 3260

# Rescan
pvesm scan <target_ip>
```

### Authentication Failed

**Cause:** CHAP credentials mismatch

**Resolution:**
- Confirm CHAP username/password on target
- Update Proxmox storage config

### Storage Not Appearing

**Cause:** LUNs not mapped to initiator

**Resolution:**
- Verify initiator IQN allowed on target
- Check LUN mapping on target

### Slow Performance

**Cause:** Network congestion, shared NICs

**Resolution:**
- Use dedicated storage network
- Enable jumbo frames if supported
- Ensure NICs are at 10Gb+ for heavy workloads

## Verification Checklist

- iSCSI target discovered
- Storage appears in Datacenter → Storage
- LUNs visible and usable
- No authentication errors
- Latency acceptable

## Rollback

```bash
# Remove storage from Proxmox
pvesm remove iscsi-storage

# Logout from sessions
iscsiadm -m node -u
```

## Related Playbooks

- [[proxmox-storage-management.md]] — Storage operations
- [[proxmox-backup-restore.md]] — Backup/restore impacts
- [[zfs-dataset-transfer.md]] — ZFS migrations

## Notes

- Default iSCSI port: 3260
- Always use CHAP for security
- Use dedicated VLAN for storage traffic if possible
