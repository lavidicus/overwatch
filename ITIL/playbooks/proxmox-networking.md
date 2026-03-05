# Proxmox Networking

## Overview

Configure and troubleshoot Proxmox VE networking including bridges, VLANs, bond interfaces, and network isolation for VMs and containers.

---

## 1) View Current Network Configuration

### List All Network Interfaces

```bash
# Network interfaces
ip link show

# Detailed interface info
ip -d link show

# Network configuration file
cat /etc/network/interfaces
```

### Check Network Routes

```bash
# Routing table
ip route show

# Default gateway
ip route | grep default

# DNS configuration
cat /etc/resolv.conf
```

### Test Network Connectivity

```bash
# Ping test
ping -c 4 8.8.8.8

# DNS resolution
nslookup google.com

# Trace route
traceroute 8.8.8.8
```

---

## 2) Configure Network Bridge

### Create Bridge for VMs/Containers

```bash
# Edit network configuration
sudo vim /etc/network/interfaces
```

Add:
```bash
# Physical interface
auto eth0
iface eth0 inet manual

# Bridge for VMs and LXC
auto vmbr0
iface vmbr0 inet static
    address 192.168.1.100/24
    gateway 192.168.1.1
    bridge-ports eth0
    bridge-stp off
    bridge-fd 0
    bridge-maxwait 0
```

Apply configuration:
```bash
# Test configuration first
sudo ifdown vmbr0 && sudo ifup vmbr0

# Or restart networking (may cause brief outage)
sudo systemctl restart networking
```

### Verify Bridge

```bash
# Check bridge interfaces
brctl show vmbr0

# Check bridge status
ip addr show vmbr0
```

---

## 3) Configure VLAN Support

### Add VLAN Interface

```bash
# Edit network configuration
sudo vim /etc/network/interfaces
```

Add:
```bash
# VLAN 100 for VMs
auto eth0.100
iface eth0.100 inet manual

# Bridge for VLAN 100
auto vmbr100
iface vmbr100 inet static
    address 192.168.100.100/24
    gateway 192.168.100.1
    bridge-ports eth0.100
    bridge-stp off
    bridge-fd 0
```

### Assign VM to VLAN

```bash
# Via CLI
pvesh create /nodes/$(hostname)/qemu/100/netif \
  --bridge vmbr100 \
  --name net0

# Via Web Interface:
# VM → Hardware → Network device → Edit → Bridge
```

### Verify VLAN Tagging

```bash
# Check VLAN interfaces
ip -d link show | grep eth0

# View VLAN traffic
tcpdump -i eth0 -n vlan
```

---

## 4) Configure Network Bonding (High Availability)

### Create Bond Interface (802.3ad/LACP)

```bash
# Edit network configuration
sudo vim /etc/network/interfaces
```

Add:
```bash
# Bond interface (mode 4 = 802.3ad)
auto bond0
iface bond0 inet static
    address 192.168.1.100/24
    gateway 192.168.1.1
    bond-slaves none
    bond-mode 802.3ad
    bond-miimon 100
    bond-downdelay 200
    bond-updelay 200
    bond-lacp_rate 1

# Member interfaces
auto eth0
iface eth0 inet manual
    bond-master bond0

auto eth1
iface eth1 inet manual
    bond-master bond0
```

Apply:
```bash
sudo systemctl restart networking
```

### Verify Bond

```bash
# Bond status
cat /proc/net/bonding/bond0

# Link status
ip link show bond0
```

---

## 5) Configure Proxmox Firewall

### Enable Firewall

```bash
# Enable firewall on node
pvesh create /nodes/$(hostname)/firewall/enable \
  --enable 1

# Check firewall status
pvesh get /nodes/$(hostname)/firewall/status
```

### Add Firewall Rules

```bash
# Allow SSH
pvesh create /nodes/$(hostname)/firewall/rules \
  --chain INPUT \
  --action ACCEPT \
  --protocol tcp \
  --destination-port 22

# Allow HTTP/HTTPS
pvesh create /nodes/$(hostname)/firewall/rules \
  --chain INPUT \
  --action ACCEPT \
  --protocol tcp \
  --destination-port 80,443

# Allow VM traffic on bridge
pvesh create /nodes/$(hostname)/firewall/rules \
  --chain FORWARD \
  --action ACCEPT \
  --in-interface vmbr0
```

### View Firewall Rules

```bash
# List all rules
pvesh get /nodes/$(hostname)/firewall/rules

# View iptables rules
sudo iptables -L -n -v
```

---

## 6) Configure Network Isolation

### Isolate VM from External Network

```bash
# Create isolated bridge
sudo vim /etc/network/interfaces
```

Add:
```bash
# Internal network only (no gateway)
auto vmbr-int
iface vmbr-int inet static
    address 10.0.0.1/24
    bridge-ports eth0
    bridge-stp off
    # No gateway = no external access
```

### Add Firewall Rule to Block External Access

```bash
# Block outgoing traffic to internet
pvesh create /nodes/$(hostname)/firewall/rules \
  --chain FORWARD \
  --action DROP \
  --in-interface vmbr-int \
  --destination 0.0.0.0/0 \
  --destination-not-port 22,80,443
```

### Isolate Container Network

```bash
# Create isolated container network
pvesh create /nodes/$(hostname)/lxc/100/netif \
  --bridge vmbr-int \
  --name net0 \
  --hwaddr 00:00:00:00:00:01
```

---

## 7) Troubleshoot Network Issues

### Check Interface Status

```bash
# All interfaces
ip link show

# Bridge status
brctl show

# Interface statistics
ip -s link show
```

### Test Network Connectivity

```bash
# Ping gateway
ping -c 4 192.168.1.1

# Ping external
ping -c 4 8.8.8.8

# DNS resolution
nslookup google.com
```

### Check Firewall Rules

```bash
# View iptables rules
sudo iptables -L -n -v -t filter

# View Proxmox firewall
pvesh get /nodes/$(hostname)/firewall/rules

# Check for dropped packets
sudo iptables -L -n -v | grep -i drop
```

### Debug Bridge Issues

```bash
# Check bridge ports
brctl showvmbr0

# Monitor bridge traffic
tcpdump -i vmbr0 -n

# Check for broadcast storms
brctl showmacs vmbr0
```

---

## 8) Advanced: Macvlan/IPvlan Interfaces

### Create Macvlan for VM

```bash
# Create macvlan interface
sudo ip link add link eth0 macvlan0 type macvlan mode bridge

# Add to bridge
sudo brctl addif vmbr0 macvlan0

# Or via CLI
pvesh create /nodes/$(hostname)/qemu/100/netif \
  --bridge macvlan0 \
  --name net0
```

### Create IPvlan for Container

```bash
# Create ipvlan interface
sudo ip link add link eth0 ipvlan0 type ipvlan mode l2

# Add to bridge
sudo brctl addif vmbr0 ipvlan0
```

---

## 9) Success Criteria

- ✅ All network interfaces up and responding
- ✅ VMs and containers can reach external network (if intended)
- ✅ Firewall rules applied correctly
- ✅ No network packet drops (monitor via `ip -s link`)
- ✅ DNS resolution working

---

## 10) Escalation Data to Collect

If network issues persist:

1. **Interface status:**
   ```bash
   ip link show
   ip addr show
   ```

2. **Bridge information:**
   ```bash
   brctl show
   brctl showmacs vmbr0
   ```

3. **Firewall rules:**
   ```bash
   sudo iptables -L -n -v
   pvesh get /nodes/$(hostname)/firewall/rules
   ```

4. **Network statistics:**
   ```bash
   ip -s link show
   ```

5. **Packet capture:**
   ```bash
   tcpdump -i vmbr0 -n -c 100
   ```

---

**Owner:** Sam (ops butler AI)  
**Last Updated:** 2026-03-05 04:21 UTC  
**Status:** Ready for deployment