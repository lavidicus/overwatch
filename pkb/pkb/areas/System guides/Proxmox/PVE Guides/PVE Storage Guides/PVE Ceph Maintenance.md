# Ceph Complete Removal

## Overview

Completely stop Ceph services, purge data, and uninstall Ceph packages from a Proxmox host. **DESTRUCTIVE OPERATION — all Ceph data will be lost.**

## When to Use

- Decommissioning Ceph storage
- Converting host to non-Ceph use
- Clean reinstall required
- Troubleshooting corrupted Ceph installation

## Prerequisites

- ⚠️ **BACKUP ALL CRITICAL DATA FIRST**
- Root or sudo privileges
- Understanding of Ceph architecture (mon, mgr, mds, osd)
- Acceptance of total data loss in Ceph cluster

## Quick Summary

```bash
systemctl stop ceph-*.target && rm -rf /etc/systemd/system/ceph* && killall -9 ceph-* && rm -rf /var/lib/ceph/{mon,mgr,mds}/ && pveceph purge && apt purge ceph
```

## Detailed Procedure

### ⚠️ Pre-Procedure Warnings

```bash
# VERIFY you have backups
df -h  # Check what's stored on Ceph
zfs list | grep ceph  # If using ZFS

# Confirm you want to proceed
echo "I understand this will delete all Ceph data"
```

### Step 1: Stop Ceph Services

**Stop monitor services:**

```bash
systemctl stop ceph-mon.target
```

**Stop manager services:**

```bash
systemctl stop ceph-mgr.target
```

**Stop metadata server services:**

```bash
systemctl stop ceph-mds.target
```

**Stop OSD services:**

```bash
systemctl stop ceph-osd.target
```

**Verify services stopped:**

```bash
systemctl list-units | grep ceph
ps aux | grep ceph
```

### Step 2: Prevent Service Auto-Start

```bash
# Remove systemd unit files
rm -rf /etc/systemd/system/ceph*

# Reload systemd
systemctl daemon-reload
```

### Step 3: Force Kill Remaining Processes

```bash
# Kill any lingering Ceph processes
killall -9 ceph-mon ceph-mgr ceph-mds ceph-osd

# Verify no processes remain
ps aux | grep ceph
```

### Step 4: Remove Ceph Data

```bash
# ⚠️ THIS DESTROYS ALL CEPH DATA
rm -rf /var/lib/ceph/mon/
rm -rf /var/lib/ceph/mgr/
rm -rf /var/lib/ceph/mds/
rm -rf /var/lib/ceph/osd/
```

**Verify removal:**

```bash
ls -la /var/lib/ceph/
```

### Step 5: Run Proxmox Ceph Purge

```bash
# Proxmox-specific cleanup
pveceph purge
```

### Step 6: Uninstall Ceph Packages

```bash
# Purge Ceph and dependencies
apt purge ceph -y

# Auto-remove unused dependencies
apt autoremove -y
```

## Verification

```bash
# No Ceph packages installed
dpkg -l | grep ceph

# No Ceph processes running
ps aux | grep ceph

# No Ceph systemd units
systemctl list-units | grep ceph

# No Ceph directories
ls /var/lib/ceph/  # Should be empty or missing
ls /etc/systemd/system/ | grep ceph  # Should return nothing
```

## Post-Procedure

**Recommended reboot:**

```bash
reboot
```

**After reboot, verify:**

```bash
# Confirm clean state
systemctl list-units | grep ceph  # Empty
ps aux | grep ceph  # Empty
dpkg -l | grep ceph  # Empty
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Failed to stop ceph-*.target" | Service hung | Use `killall -9 ceph-*` |
| "Package ceph not installed" | Already removed | Skip to verification |
| "Directory not empty" | Data still present | Check `find /var -name "*ceph*"` |
| "Dependency issues" | Other packages using Ceph | Check `apt remove --dry-run ceph` |

## Notes

- **This is irreversible** — ensure backups exist
- Ceph OSD data may be on separate disks — verify before deletion
- If clustered, remove node from cluster first via web UI
- Consider `apt-cache depends ceph` to see dependencies
- Journal logs preserved in `/var/log/journal/`

## Related

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE Storage Guides/ZFS Dataset Transfer Guide]]
- [[ITIL/playbooks/proxmox-storage-management-v2.md]]

---
**Last Updated:** 2026-03-07
