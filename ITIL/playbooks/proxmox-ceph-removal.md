# Proxmox Ceph Service Shutdown & Removal

## Overview

Playbook for **fully stopping and removing Ceph** from a Proxmox environment. **This is destructive and results in data loss.** Only use when decommissioning Ceph.

---

## 1) Pre-Change Checklist

### REQUIRED

- ✅ Confirm Ceph decommission approved (Change ticket required)
- ✅ **Backup all critical Ceph data**
- ✅ Ensure console access
- ✅ Root/sudo access

```bash
# Check Ceph cluster health
ceph -s

# List OSDs
ceph osd tree

# List pools
ceph osd pool ls
```

---

## 2) Stop Ceph Services

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

---

## 3) Disable Service Restarts

```bash
# Remove systemd unit files
sudo rm -rf /etc/systemd/system/ceph*
```

**WARNING:** Double-check path before `rm -rf`.

---

## 4) Kill Remaining Ceph Processes

```bash
sudo killall -9 ceph-mon ceph-mgr ceph-mds
```

---

## 5) Remove Ceph Data Directories

**⚠️ THIS DELETES DATA**

```bash
sudo rm -rf /var/lib/ceph/mon/ /var/lib/ceph/mgr/ /var/lib/ceph/mds/
```

---

## 6) Purge Ceph in Proxmox

```bash
sudo pveceph purge
```

---

## 7) Uninstall Ceph Packages

```bash
sudo apt purge ceph

# Verify removal
dpkg -l | grep ceph
```

---

## 8) Post-Removal Cleanup

```bash
# Reboot (recommended)
sudo reboot

# Optional: Remove lingering files
find /etc -name "*ceph*" -type f
find /var/lib -name "*ceph*" -type f
```

---

## Related PKB Guides

- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE Storage Guides/PVE Ceph Maintenance]]

---

*Created: 2026-03-07 | Priority: P1 | Category: Change Management*
