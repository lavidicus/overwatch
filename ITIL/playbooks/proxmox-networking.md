# Proxmox Networking

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [proxmox, networking, bridge, vlan, firewall]
---

## Overview

Playbook for managing Proxmox networking including bridges, VLANs, and firewall configuration.

## Priority

**P2** — Network operations are important but planned

## Category

**Operations**

## Estimated Duration

- **Total:** ~15-30 minutes
- **Critical path:** ~5-10 minutes (network config)
- **Notes:** Changes may require reboot

## Communication

- **Before starting:** Notify of potential connectivity loss
- **During:** Update on major changes
- **After:** Verify connectivity restored

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Network disconnection | High | Have console access ready |
| VM network loss | Medium | Test on non-production first |
| Firewall blocking | Medium | Document rules before changes |

## Prerequisites

- **Access:** Console access (IPMI/iDRAC) required
- **Network:** Network topology documented
- **Backup:** Network config backed up

## Procedure

### Configure Bridge

```bash
# Edit network configuration
sudo vim /etc/network/interfaces

# Add bridge configuration
auto vmbr0
iface vmbr0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
    bridge_ports eth0
    bridge_stp off
    bridge_fd 0
```

### Add VLAN

```bash
# Add VLAN interface
auto vmbr0.100
iface vmbr0.100 inet static
    address 192.168.100.100
    netmask 255.255.255.0
    vlan 100
    bridge_ports eth0
    bridge_stp off
    bridge_fd 0
```

### Configure Firewall

```bash
# Enable firewall
pvefw set_config enabled 1

# Add firewall rule
pvefw add <type> <config>

# List rules
pvefw show <type>
```

### Troubleshoot Network

```bash
# Check interfaces
ip addr show

# Check bridges
brctl show

# Check VLANs
ip link show | grep vlan

# Test connectivity
ping <target>
```

## Verification

```bash
# Bridge exists
brctl show | grep vmbr0

# VLAN exists
ip link show | grep vlan

# Firewall status
pvefw show_config | grep enabled
```

## Common Issues

### Network Down After Config

**Symptoms:**
- Can't SSH to Proxmox
- VMs lose connectivity

**Resolution:**

```bash
# Via console, restore config
sudo cp /etc/network/interfaces.backup /etc/network/interfaces

# Restart networking
systemctl restart networking
```

### Bridge Not Working

**Symptoms:**
- VMs can't reach network
- Bridge not visible

**Resolution:**

```bash
# Check bridge modules loaded
lsmod | grep bridge

# Restart bridge
systemctl restart networking

# Verify bridge
brctl show
```

## Rollback

```bash
# Restore network config
sudo cp /etc/network/interfaces.backup /etc/network/interfaces

# Restart networking
systemctl restart networking

# Reboot if necessary
reboot
```

## Related Playbooks

- [[proxmox-vm-lxc-migration.md]] — Migrate VMs during network changes

## Notes

- Always have console access before network changes
- Test on non-production first
- Document network topology

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
