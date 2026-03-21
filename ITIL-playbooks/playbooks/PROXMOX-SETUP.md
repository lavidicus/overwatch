# Proxmox VE Setup Guide

This guide covers complete setup procedures for Proxmox VE clusters and individual nodes.

## Quick Reference

- **Proxmox VE Download:** https://www.proxmox.com/en/proxmox-ve/download
- **ISO Images:** https://proxmox.com/en/downloads
- **Documentation:** https://pve.proxmox.com/wiki/Main_Page

## Cluster Architecture

### IP Address Scheme

**Management Network (172.16.254.0/24):**
```
pve-1:  172.16.254.240  (Primary node, cluster manager)
pve-2:  172.16.254.241  (Secondary node)
pve-3:  172.16.254.242  (Tertiary node)
```

**Storage/VM Network (172.16.253.0/24):**
```
pve-1:  172.16.253.240
pve-2:  172.16.253.241
pve-3:  172.16.253.242
```

### Hostname Resolution (Management Network)

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
- **2+ Network interfaces:**
  - Management NIC: 172.16.254.0/24 (web UI, SSH, cluster mgmt)
  - Storage/VM NIC: 172.16.253.0/24 (VM traffic, storage, cluster comms)
- SSD/NVMe for storage (recommended for VM disks)

### Network Requirements
- **Two network interfaces per node:**
  - Management network: 172.16.254.0/24 (for web UI, SSH, cluster mgmt)
  - Storage/VM network: 172.16.253.0/24 (for VM traffic, storage, cluster comms)
- DNS resolution (or /etc/hosts entries on management network)
- Open ports:
  - 22 (SSH)
  - 8006 (Proxmox web UI)
  - 5404 (Cluster communication)
  - 2222 (Corosync/HA communication)
  - 8007 (Ceph REST API if using Ceph)
  - 3300-3302 (Ceph OSD communication)

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

#### Network Configuration (Second Network Interface)

Configure the storage/VM network (172.16.253.0/24):

```bash
# Edit network configuration
nano /etc/network/interfaces

# Add second network interface (example for eth1):
auto eth1
iface eth1 inet static
    address 172.16.253.240/24
    # No gateway - management network handles routing
    # bridge_ports none for L2 storage network
```

Replace 240 with appropriate host IP per node:
- pve-1: 172.16.253.240
- pve-2: 172.16.253.241
- pve-3: 172.16.253.242

```bash
# Restart networking
systemctl restart networking

# Verify connectivity
ping -I eth1 172.16.253.241  # Test to pve-2
ping -I eth1 172.16.253.242  # Test to pve-3
```
```bash
# Access web UI at https://<IP>:8006
# Login as root with your password

# Update repository (Debian bookworm for PVE 9.x)
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
   - Or CLI: `pvecm create 9XCLAB`

2. **Add Nodes (pve-2 and pve-3):**

   **Option A: Manual corosync.conf (Recommended for automation)**
   ```bash
   # Update corosync.conf to include all nodes
   cat > /etc/pve/corosync.conf << 'EOF'
   logging {
     debug: off
     to_syslog: yes
   }

   nodelist {
     node {
       name: pve-1
       nodeid: 1
       quorum_votes: 1
       ring0_addr: 172.16.254.240
     }
     node {
       name: pve-2
       nodeid: 2
       quorum_votes: 1
       ring0_addr: 172.16.254.241
     }
     node {
       name: pve-3
       nodeid: 3
       quorum_votes: 1
       ring0_addr: 172.16.254.242
     }
   }

   quorum {
     provider: corosync_votequorum
   }

   totem {
     cluster_name: 9XCLAB
     config_version: 1
     interface {
       linknumber: 0
     }
     ip_version: ipv4-6
     link_mode: passive
     secauth: on
     version: 2
   }
   EOF

   # Copy to all nodes
   scp /etc/pve/corosync.conf root@pve-2:/etc/pve/corosync.conf
   scp /etc/pve/corosync.conf root@pve-3:/etc/pve/corosync.conf

   # Restart corosync on all nodes
   systemctl restart corosync
   ```

   **Option B: Interactive join (if SSH keys not configured)**
   ```bash
   # On pve-2 and pve-3
   pvecm add 172.16.254.240
   # Enter root password when prompted
   ```

### Verify Cluster

```bash
# Check cluster status
pvecm status

# View cluster nodes
pvecm nodes

# Check quorum
cat /etc/pve/corosync.conf

# If quorum is lost, force single-node quorum (for testing)
pvecm expected 1
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
