# IPMI Tool Management in Proxmox

## Overview

Install and manage IPMI (Intelligent Platform Management Interface) using `ipmitool` to remotely monitor server hardware, even when the OS is unavailable.

## When to Use

- Monitoring server health (temperatures, fans, voltages)
- Remote power control (on/off/reset)
- Managing IPMI user accounts
- Checking system event logs

## Prerequisites

- Proxmox server with shell access (SSH or console)
- Root or sudo privileges
- IPMI interface accessible on the server

## Quick Summary

```bash
apt install ipmitool -y && ipmitool sensor list
```

## Detailed Procedure

### Step 1: Install ipmitool

```bash
apt install ipmitool -y
```

### Step 2: Check Sensor Readings

View all sensors:

```bash
ipmitool sensor list
```

Filter for specific types:

```bash
# Temperatures only
ipmitool sensor list | grep -i temp

# Fan speeds
ipmitool sensor list | grep -i fan

# Voltages
ipmitool sensor list | grep -i volt
```

### Step 3: Manage IPMI Users

List users:

```bash
ipmitool user list
```

View user details:

```bash
ipmitool user summary <user_id>
```

Set username:

```bash
ipmitool user set name <user_id> <username>
```

Set password:

```bash
ipmitool user set password <user_id> <password>
```

Set privilege level:

```bash
# 0x1 = callback, 0x2 = user, 0x3 = operator, 0x4 = administrator
ipmitool user priv <user_id> <privilege>
```

### Step 4: Remote Power Control

```bash
# Check power status
ipmitool power status

# Power on
ipmitool power on

# Power off
ipmitool power off

# Force cycle
ipmitool power cycle

# Warm reset
ipmitool power reset
```

### Step 5: View System Event Log

```bash
# List SEL entries
ipmitool sel list

# Clear SEL
ipmitool sel clear
```

## Verification

```bash
# Confirm ipmitool installed
ipmitool --version

# Confirm sensors readable
ipmitool sensor list | head -5

# Confirm user list accessible
ipmitool user list
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Device /dev/ipmi0 not found" | IPMI device not available | Check `ls /dev/ipmi*` |
| "Permission denied" | Insufficient privileges | Use `sudo` or run as root |
| "Cannot open a session" | IPMI service stopped | `systemctl restart ipmi_watchdog` |

## Notes

- Default IPMI port: 623
- User IDs range from 1-15
- Privilege level 0x4 (administrator) has full access
- Protect IPMI credentials — they provide significant hardware control

## Related

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE System Tools/System-V Tools]]

---
**Last Updated:** 2026-03-07
