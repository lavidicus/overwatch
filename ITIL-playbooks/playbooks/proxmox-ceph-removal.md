# Proxmox Ceph Service Shutdown & Removal

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [proxmox, ceph, storage, removal, destructive]
---

## Overview

Playbook for **fully stopping and removing Ceph** from a Proxmox environment. **This is destructive and results in data loss.** Only use when decommissioning Ceph.

## Priority

**P1** — Destructive operation, requires caution

## Category

**Change Management**

## Estimated Duration

- **Total:** ~30-60 minutes
- **Critical path:** ~20 minutes (shutdown + removal)
- **Notes:** Data removal may take time

## Communication

- **Before starting:** **CRITICAL** — Confirm decommission approved
- **During:** Update on progress
- **After:** Document Ceph removal

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| **Data loss** | **CRITICAL** | Backup all critical data first |
| Storage unavailable | High | Ensure alternative storage ready |
| VM/LXC downtime | High | Migrate before removal |

## Prerequisites

- **Approval:** ✅ Confirm Ceph decommission approved (Change ticket required)
- **Backup:** ✅ **Backup all critical Ceph data**
- **Access:** ✅ Root/sudo access
- **Console:** ✅ Ensure console access

## Procedure

### Step 1: Pre-Change Checklist

```bash
# Check Ceph cluster health
ceph -s

# List OSDs
ceph osd tree

# List pools
ceph osd pool ls
```

### Step 2: Stop Ceph Services

```bash
# Stop monitor services
sudo systemctl stop ceph-mon.target

# Stop manager services
sudo systemctl stop ceph-mgr.target

# Stop metadata services
sudo systemctl stop ceph-mds.target

# Stop OSD services
sudo systemctl stop ceph-osd.target
```

### Step 3: Disable Service Restarts

```bash
# Remove systemd unit files
sudo rm -rf /etc/systemd/system/ceph*
```

**WARNING:** Double-check path before `rm -rf`.

### Step 4: Kill Remaining Ceph Processes

```bash
sudo killall -9 ceph-mon ceph-mgr ceph-mds
```

### Step 5: Remove Ceph Data Directories

**⚠️ THIS DELETES DATA**

```bash
sudo rm -rf /var/lib/ceph/mon/ /var/lib/ceph/mgr/ /var/lib/ceph/mds/
```

### Step 6: Purge Ceph in Proxmox

```bash
sudo pveceph purge
```

### Step 7: Uninstall Ceph Packages

```bash
sudo apt purge ceph

# Verify removal
dpkg -l | grep ceph
```

### Step 8: Post-Removal Cleanup

```bash
# Reboot (recommended)
sudo reboot

# Optional: Remove lingering files
find /etc -name "*ceph*" -type f
find /var/lib -name "*ceph*" -type f
```

## Verification

```bash
# Ceph not running
systemctl list-units | grep ceph

# Ceph not installed
dpkg -l | grep ceph

# No Ceph directories
ls /var/lib/ceph/
```

## Related PKB Guides

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE Storage Guides/PVE Ceph Maintenance]]

## Notes

- **THIS IS DESTRUCTIVE** — All Ceph data will be lost
- Backup everything before starting
- Ensure alternative storage is ready
- Test on non-production first

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
