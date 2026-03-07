# Proxmox IPMI Tool Configuration

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [proxmox, ipmi, hardware, monitoring]
---

## Overview

Playbook for installing and configuring IPMI tools on Proxmox hosts for remote hardware management.

## Priority

**P2** — Important for hardware monitoring but not emergency

## Category

**Operations**

## Estimated Duration

- **Total:** ~10-20 minutes
- **Critical path:** ~5 minutes (install + verify)
- **Notes:** Remote config may take longer

## Communication

- **Before starting:** No notification needed
- **After completion:** Verify hardware monitoring works
- **If blocked:** Check IPMI network connectivity

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Incorrect sensor readings | Low | Verify with multiple tools |
| IPMI lockout | Medium | Know default credentials |
| Network misconfiguration | Medium | Document current config |

## Prerequisites

- **Access:** Root or sudo on Proxmox host
- **Network:** IPMI interface accessible
- **Credentials:** IPMI username/password

## Procedure

### Step 1: Installation

```bash
# Install ipmitool package
apt install ipmitool -y

# Verify installation
ipmitool --version
```

### Step 2: Monitor Hardware Sensors

```bash
# List all sensor readings
ipmitool sensor list

# Filter for temperatures only
ipmitool sensor list | grep -i temp

# Check fan speeds
ipmitool sensor list | grep -i fan

# Check voltages
ipmitool sensor list | grep -i volt
```

**Example Output:**
```
System Temp       24.0 C  ok
CPU Temp          45.0 C  ok
Fan 1             2500 RPM ok
+12V              12.1 V  ok
```

### Step 3: Manage IPMI Users

```bash
# List all IPMI users
ipmitool user list

# View detailed user info
ipmitool user summary <user_id>

# Set username
ipmitool user set name <user_id> <username>

# Set password
ipmitool user set password <user_id> <password>

# Set privilege level
# 0x1 = callback
# 0x2 = user
# 0x3 = operator
# 0x4 = administrator
ipmitool user priv <user_id> <privilege>

# Enable user account
ipmitool user enable <user_id>
```

**Example: Create Admin User**

```bash
# Create user ID 3 named 'ipmiadmin' with admin privileges
ipmitool user set name 3 ipmiadmin
ipmitool user set password 3 SecurePass123!
ipmitool user priv 3 0x4
ipmitool user enable 3

# Verify
ipmitool user summary 3
```

### Step 4: Remote Management

```bash
# Get power status
ipmitool power status

# Power on
ipmitool power on

# Power off (graceful)
ipmitool power off

# Force power cycle
ipmitool power cycle

# Reset (warm boot)
ipmitool power reset

# Get system info
ipmitool mc info

# Get BMC info
ipmitool mc chassis info

# Get SEL (System Event Log)
ipmitool sel list

# Clear SEL
ipmitool sel clear
```

### Step 5: Remote LAN Configuration

```bash
# Get LAN configuration
ipmitool lan print

# Get specific settings
ipmitool lan print 1 | grep -E "IP Address|IP Subnet|Default Gateway"

# Set IP address (static)
ipmitool lan set 1 ipaddr <ip_address>
ipmitool lan set 1 netmask <subnet_mask>
ipmitool lan set 1 defgw <gateway_ip>

# Set to DHCP
ipmitool lan set 1 ipsrc dhcp

# Verify
ipmitool lan print 1
```

## Troubleshooting

### ipmitool Not Responding

```bash
# Check if ipmi device exists
ls -l /dev/ipmi*

# Check ipmi_watchdog service
systemctl status ipmi_watchdog

# Restart if needed
systemctl restart ipmi_watchdog
```

### Permission Denied

```bash
# Check user permissions
id

# Use sudo
sudo ipmitool sensor list
```

### Remote Access Issues

```bash
# Check IPMI is reachable
ping <ipmi_ip>

# Test SSH to IPMI
ssh <user>@<ipmi_ip>

# Check firewall
iptables -L -n | grep 623
```

## Automation

### Health Check Script

```bash
#!/bin/bash
# IPMI health check

TEMP=$(ipmitool sensor list | grep -i "temp" | awk '{print $2}')
FAN=$(ipmitool sensor list | grep -i "fan" | awk '{print $2}')

if [ $TEMP -gt 80 ]; then
    echo "WARNING: High temperature detected: $TEMP C"
fi

if [ $FAN -eq 0 ]; then
    echo "CRITICAL: Fan failure detected"
fi
```

## Verification

```bash
# Sensors readable
ipmitool sensor list | wc -l

# User configured
ipmitool user summary 3

# LAN configured
ipmitool lan print 1 | grep -E "IP Address|IP Subnet"
```

## Related PKB Guides

- [[pkb/areas/System guides/Proxmox/PVE System Tools/IPMI Tool Management]]

## Notes

- Default IPMI port: 623
- User IDs 1-15 available
- Privilege levels: callback(1), user(2), operator(3), admin(4)

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
