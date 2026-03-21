# Proxmox Host Reconfiguration

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [proxmox, hostname, ip, network, cluster]
---

## Overview

Playbook for safely changing Proxmox hostnames and IP addresses, including cluster-aware procedures and recovery from misconfiguration.

## Priority

**P2** — Important but requires planning

## Category

**Change Management**

## Estimated Duration

- **Total:** ~20-40 minutes
- **Critical path:** ~10 minutes (config + reboot)
- **Notes:** Cluster operations may take longer

## Communication

- **Before starting:** Notify team of planned downtime
- **During:** Update on connectivity loss
- **After:** Verify all services restored

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Lost connectivity | High | Have console/IPMI access ready |
| Cluster communication fail | High | Plan maintenance window |
| Service disruption | Medium | Schedule during low-usage |

## Prerequisites

- **Backup:** ✅ Create backup (REQUIRED)
- **Console:** ✅ Verify console access works
- **Access:** ✅ Root/sudo access
- **Documentation:** ✅ Document current state

## Procedure

### Step 1: Pre-Flight Checks

```bash
# 1. Create backup (REQUIRED)
# Via web UI: Datacenter → Backup → Add → Backup Job
# Or manual:
vzdump --storage backup --mode snapshot <vmid>

# 2. Verify console access works
# Test IPMI/iDRAC access before proceeding

# 3. Check current configuration
cat /etc/hostname
cat /etc/hosts
ip addr show vmbr0

# 4. Check if clustered
pvecm status
pvecm nodes

# 5. Document current state
echo "Hostname: $(hostname)"
echo "IP: $(ip addr show vmbr0 | grep 'inet ' | awk '{print $2}')"
echo "Date: $(date)"
```

### Step 2: Check Cluster Membership

```bash
# Check cluster membership
pvecm status

# If clustered, output shows:
# quorum: 1
# expected votes: 2
# total votes: 2

# List cluster nodes
pvecm nodes
```

### Step 3: Change Hostname

**Method 1: hostnamectl (Recommended)**

```bash
# Set new hostname
sudo hostnamectl set-hostname <new_hostname>

# Verify change pending
hostnamectl

# Update /etc/hosts
sudo vim /etc/hosts

# Ensure this line exists:
# 127.0.1.1   <new_hostname>

# Reboot for full propagation
reboot
```

**Method 2: Manual (Legacy)**

```bash
# Edit hostname file
sudo vim /etc/hostname
# Replace content with new hostname

# Edit /etc/hosts
sudo vim /etc/hosts
# Update 127.0.1.1 line

# Reboot
reboot
```

### Step 4: Change IP Address

**For Standalone Hosts:**

```bash
# Backup current config
sudo cp /etc/network/interfaces /etc/network/interfaces.backup.$(date +%Y%m%d)

# Edit network configuration
sudo vim /etc/network/interfaces

# Find and modify interface section:
auto vmbr0
iface vmbr0 inet static
    address 192.168.1.100    # Change this
    netmask 255.255.255.0   # Verify this
    gateway 192.168.1.1      # Verify this

# Restart networking (may lose SSH)
sudo systemctl restart networking

# Alternative if above fails:
sudo ifdown vmbr0 && sudo ifup vmbr0

# Verify new IP
ip addr show vmbr0
```

**For Clustered Hosts:**

**⚠️ CRITICAL: Do NOT edit /etc/network/interfaces directly in a cluster!**

**Via Web UI (Recommended):**

1. Navigate to **Node → Network** in Proxmox web UI
2. Select bridge (e.g., vmbr0)
3. Click **Edit**
4. Change IP address
5. Click **Update** (confirm you'll lose connection)
6. Reconnect to new IP

**Via CLI (pvecluster):**

```bash
# Update node in cluster
pvecm update <new_ip>

# Verify cluster sees new IP
pvecm nodes

# Check cluster communication
pvecm status
```

### Step 5: Change Both Hostname and IP

**Recommended Order:**

1. **Change hostname first** (less disruptive)
2. **Reboot**
3. **Change IP address** (causes downtime)

### Step 6: Post-Change Verification

**Network Verification:**

```bash
# Check IP address
ip addr show vmbr0

# Test connectivity
ping -c 3 8.8.8.8
ping -c 3 google.com

# Verify Proxmox services
systemctl status pveproxy
systemctl status pvedaemon

# Test web interface
# Browser: https://<new_ip>:8006
```

**Cluster Verification (if applicable):**

```bash
# Check cluster status
pvecm status

# List nodes
pvecm nodes

# Verify corosync
systemctl status corosync

# Check cluster communication
corosync-cmapctl
```

**Service Verification:**

```bash
# Check VMs/containers running
qm list
pct list

# Verify storage accessible
pvesm status

# Check replication status (if configured)
replication list
```

## Recovery from Lost Connectivity

### Scenario: Wrong IP, Locked Out

**Via Console/IPMI:**

```bash
# 1. Access via IPMI/iDRAC console

# 2. Check current config
cat /etc/network/interfaces

# 3. Restore from backup
sudo cp /etc/network.interfaces.backup.* /etc/network/interfaces

# 4. Restart networking
sudo systemctl restart networking

# 5. Verify old IP works
ip addr show vmbr0
```

**Via Rescue Mode:**

```bash
# 1. Boot into rescue mode

# 2. Mount root filesystem
mount /dev/sdXY /mnt

# 3. Edit network config
vim /mnt/etc/network/interfaces

# 4. Reboot
reboot
```

## DNS and External Updates

### Update DNS Records

```bash
# If using dynamic DNS
dnsupdate -z <zone> <record> <new_ip>

# Or update manually in DNS management console
```

### Update External References

**Checklist:**

- [ ] DNS A/AAAA records
- [ ] Firewall rules referencing old IP
- [ ] Monitoring systems (Nagios, Zabbix, etc.)
- [ ] Backup servers targeting this host
- [ ] Replication targets/sources
- [ ] Load balancer configurations
- [ ] Any scripts with hardcoded IPs

## Troubleshooting

### Proxmox Web UI Inaccessible

```bash
# Check pveproxy service
systemctl status pveproxy

# Check port 8006 listening
ss -tlnp | grep 8006

# Check firewall
iptables -L -n | grep 8006

# Restart pveproxy
systemctl restart pveproxy
```

### Cluster Communication Issues

```bash
# Check corosync
systemctl status corosync

# View corosync logs
journalctl -u corosync --since "10 minutes ago"

# Check quorum
pvecm status

# Verify nodes can ping each other
ping <node_ip>
```

### Hostname Not Resolving

```bash
# Check /etc/hosts
cat /etc/hosts

# Test resolution
getent hosts <hostname>

# Restart networking
systemctl restart networking
```

## Related PKB Guides

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE System Configurations/PVE System Name IP Change Guide]]

## Notes

- Always test on non-production first
- Have console access before making changes
- Document all changes
- Update DNS and monitoring systems

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
