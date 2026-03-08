# Proxmox VE Setup Guide

This guide covers complete setup procedures for Proxmox VE clusters and individual nodes.

## Quick Reference

- **Proxmox VE Download:** https://www.proxmox.com/en/proxmox-ve/download
- **ISO Images:** https://proxmox.com/en/downloads
- **Documentation:** https://pve.proxmox.com/wiki/Main_Page

## Cluster Architecture

### IP Address Scheme

```
pve-1:  172.16.254.240  (Primary node, cluster manager)
pve-2:  172.16.254.241  (Secondary node)
pve-3:  172.16.254.242  (Tertiary node)
```

### Hostname Resolution

All hosts have `/etc/hosts` configured for mutual resolution:
```
172.16.254.240 pve-1.9xc.local pve-1
172.16.254.241 pve-2.9xc.local pve-2
172.16.254.242 pve-3.9xc.local pve-3
```

## Prerequisites

### Hardware Requirements
- Minimum 4GB RAM (8GB+ recommended)
- 2+ CPU cores
- 2+ Network interfaces (1 for management, 1+ for storage/VM traffic)
- SSD/NVMe for storage (recommended for VM disks)

### Network Requirements
- Static IP addresses for all nodes
- DNS resolution (or /etc/hosts entries)
- Open ports:
  - 22 (SSH)
  - 8006 (Proxmox web UI)
  - 5404 (Cluster communication)
  - 2222 (Corosync/HA communication)

## Installation

### Step 1: Download ISO
```bash
# Download latest Proxmox VE ISO
wget https://download.proxmox.com/isos/proxmox-ve_8.x.iso
```

### Step 2: Install on First Node
1. Boot from ISO
2. Follow installation wizard:
   - Target disk selection
   - Network configuration (hostname, IP, gateway, DNS)
   - Timezone
   - Root password
3. Reboot after installation

### Step 3: Post-Install Configuration
```bash
# Access web UI at https://<IP>:8006
# Login as root with your password

# Update repository (Debian bookworm for PVE 8.x)
nano /etc/apt/sources.list.d/pve-enterprise.list
# Comment out enterprise repo
nano /etc/apt/sources.list.d/pve-no-subscription.list
# Uncomment no-subscription repo

# Update system
apt update && apt upgrade -y
```

## Cluster Setup

### On Primary Node (pve-1)

1. **Create Cluster:**
   - Web UI: Datacenter → Cluster → Create Cluster
   - Or CLI: `pvecluster create --name proxmox-cluster`

2. **Add Nodes:**
   - From other nodes, join cluster:
   ```bash
   pvecm add <pve-1-IP>
   ```

### Verify Cluster

```bash
# Check cluster status
pvecm status

# View cluster nodes
pvesh get /cluster/nodes

# Check quorum
cat /var/lib/pve-cluster/corrupt/corosync.conf
```

## Storage Configuration

### Local Storage
- `/var/lib/vz` - VM backups (default)
- `/var/lib/lxc` - LXC containers (default)

### Shared Storage (Recommended)
- Ceph for distributed storage
- NFS for centralized storage
- iSCSI for block storage

### Ceph Setup (3-node cluster)

```bash
# Install Ceph on all nodes
apt install ceph-mon ceph-osd ceph-mds -y

# Create OSDs
pvesm add ceph ceph0 --cluster pve-cluster

# Monitor Ceph status
ceph -s
```

## Backup Configuration

### Proxmox Backup Server (PBS)
- Separate server recommended for production
- Integrated backup solution
- Incremental backups, compression, deduplication

### Local Backup
```bash
# Configure backup job
# Web UI: Datacenter → Backup → Add
# Type: Vault
# Storage: local
# Retention: 7 daily, 4 weekly, 3 monthly
```

## High Availability

### HA Configuration
1. Enable HA in cluster settings
2. Configure resources to run with HA:
   - VMs
   - Containers
   - IP addresses
   - Filesystems

### HA Monitoring
```bash
# Check HA status
pvesh get /cluster/ha/groups

# View HA resources
pvesh get /cluster/ha/resources
```

## Security Hardening

### Firewall Configuration
```bash
# Enable firewall
pvecm updatecerts -f

# Configure firewall rules
pvefirewall update --defaultpolicy 1
```

### SSH Hardening
- Disable root SSH login
- Use key-based authentication
- Limit SSH access to management network

### Access Control
- Configure PAM authentication
- Integrate with LDAP/AD if needed
- Set up role-based access control (RBAC)

## Monitoring

### Built-in Tools
- Proxmox VE web UI
- `pvesh` CLI tools
- Corosync cluster communication

### External Monitoring
- Prometheus + Grafana
- Zabbix
- Nagios

## Troubleshooting

### Common Issues

#### Cluster Quorum Lost
```bash
# Force quorum on single node
pvecm expected 1

# Or restart cluster services
systemctl restart corosync
```

#### Ceph Issues
```bash
# Check Ceph status
ceph -s
ceph health detail

# Restart Ceph services
systemctl restart ceph-mon@pve-1
systemctl restart ceph-osd@0
```

#### Network Issues
```bash
# Check Corosync
systemctl status corosync

# Check cluster connectivity
pvesh get /cluster/links
```

## Maintenance

### System Updates
```bash
# Update all nodes
apt update && apt upgrade -y

# Update cluster configuration
pvecm updatecerts

# Reboot nodes one at a time
systemctl reboot
```

### Log Files
- `/var/log/pveupgrade` - Upgrade logs
- `/var/log/cluster.log` - Cluster logs
- `/var/log/syslog` - System logs
- `/var/log/ceph/` - Ceph logs

## Related Documentation
- [ITIL/ITIL-ISSUE-MANAGEMENT.md](../ITIL-ISSUE-MANAGEMENT.md)
- [PKB - System Admin KB](../pkb/areas/System-Administration/)
