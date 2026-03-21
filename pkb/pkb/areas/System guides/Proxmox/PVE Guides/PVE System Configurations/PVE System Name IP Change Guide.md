# Proxmox Host Name and IP Change

## Overview

Change the hostname and/or IP address of a Proxmox host. Requires careful planning due to potential service disruption and cluster implications.

## When to Use

- Rebranding or reorganizing infrastructure
- Migration to new network segment
- Correcting misconfigured hostnames/IPs
- Merging clusters or environments

## Prerequisites

- Console or SSH access to the Proxmox host
- Root or sudo privileges
- Backup of Proxmox configuration (critical!)
- Understanding of current network setup
- Planned maintenance window for IP changes

## Quick Summary

```bash
# Hostname change
hostnamectl set-hostname <new-name> && sed -i 's/oldname/newname/g' /etc/hosts && reboot

# IP change (static)
nano /etc/network/interfaces && systemctl restart networking
```

## Detailed Procedure

### Pre-Change Checklist

**⚠️ CRITICAL:** Complete these before any changes:

```bash
# 1. Backup configuration
vzdump --mode snapshot --storage <storage_name> --all

# 2. Verify current state
hostname
ip addr show
pve version

# 3. If clustered, check cluster status
pvecm status
```

### Step 1: Change Hostname

**Using hostnamectl (recommended):**

```bash
# Set new hostname
hostnamectl set-hostname <new-hostname>

# Verify
hostnamectl
```

**Update /etc/hosts:**

```bash
nano /etc/hosts
```

Ensure the line reads:
```
127.0.0.1   localhost
127.0.1.1   <new-hostname>
```

### Step 2: Change IP Address (Static)

**Identify network interface:**

```bash
ip addr show
# Note interface name (e.g., vmbr0, enp0s3)
```

**Edit network configuration:**

```bash
nano /etc/network/interfaces
```

**Modify interface section:**

```bash
auto vmbr0
iface vmbr0 inet static
    address <new-ip-address>
    netmask <subnet-mask>
    gateway <gateway-ip>
```

**Apply changes:**

```bash
systemctl restart networking

# Or restart specific interface
ifdown vmbr0 && ifup vmbr0
```

### Step 3: Change to DHCP (Alternative)

```bash
nano /etc/network/interfaces
```

Change:
```bash
iface vmbr0 inet static
```

To:
```bash
iface vmbr0 inet dhcp
```

Apply:
```bash
systemctl restart networking
```

### Step 4: Cluster Considerations

**If part of a cluster:**

```bash
# Use Proxmox web interface instead
# Or use pve cluster update command

# Update cluster node IP
pve cluster update <node-name> ip=<new-ip>
```

**Post-change cluster verification:**

```bash
# Check cluster membership
pvecm status

# Verify quorum
pvecm quorum
```

### Step 5: Reboot for Hostname Propagation

```bash
reboot
```

## Verification

```bash
# Hostname applied
hostname
hostnamectl

# IP address updated
ip addr show
ping -c 3 <new-ip>

# Network connectivity
test -n "$(ping -c 1 8.8.8.8 | grep 1 packets)" && echo "Internet OK"

# DNS resolution (if changed hostname)
getent hosts <new-hostname>

# Proxmox services running
systemctl status pve-api pveproxy
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| Lost SSH connection | IP change blocked access | Use console access to revert |
| Cluster node offline | IP not updated in cluster | Use `pve cluster update` or web UI |
| Services not starting | Wrong gateway/netmask | Verify `/etc/network/interfaces` |
| DNS resolution fails | Hosts file not updated | Update `/etc/hosts` |
| Web UI inaccessible | Wrong IP or binding issue | Check `pveproxy` logs |

## Notes

- Hostname changes require reboot for full propagation
- IP changes cause immediate service disruption
- Update DNS records after changes complete
- Update firewall rules if IP-dependent
- Document all changes for future reference
- Test from console access first if possible

## Related

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE System Tools/IPMI Tool Management]]
- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE System Tools/TailScale Container Setup Guide]]
- [[ITIL/playbooks/proxmox-ha-cluster-v2.md]]

---
**Last Updated:** 2026-03-07
