# Proxmox Backup and Restore

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [proxmox, backup, restore, vzdump, disaster-recovery]
---

## Overview

Playbook for managing Proxmox backups and restores using vzdump and the Proxmox Backup Server.

## Priority

**P2** — Important for data protection but not emergency

## Category

**Operations**

## Estimated Duration

- **Total:** ~30 minutes to several hours
- **Critical path:** ~15 minutes (restore verification)
- **Notes:** Duration depends on VM/container size

## Communication

- **Before starting:** Notify if backup may impact performance
- **During:** No updates needed for routine backups
- **After:** Confirm backup/restore completion

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Backup failure | Medium | Verify backups regularly |
| Restore corruption | High | Test restores periodically |
| Storage exhaustion | Medium | Monitor storage usage |

## Prerequisites

- **Access:** Root or sudo on Proxmox host
- **Storage:** Backup storage configured
- **VMs:** VM/container IDs to backup

## Procedure

### Create Backup

```bash
# Backup single VM
vzdump <vmid>

# Backup with compression
vzdump <vmid> --compress zstd

# Backup to specific storage
vzdump <vmid> --storage <storage_name>

# Backup multiple VMs
vzdump <vmid1> <vmid2> <vmid3>

# Backup with snapshot (zero downtime)
vzdump <vmid> --mode snapshot
```

### Schedule Backup Job

```bash
# Create backup job via CLI
echo "0 2 * * * vzdump 100 --mode snapshot --storage backup" | crontab -

# Or use Proxmox UI: Datacenter → Backup → Add → Backup Job
```

### Restore VM

```bash
# List available backups
vzdump --list-backup <storage_name>

# Restore VM from backup
vzrestore <vmid> <backup_file> --storage <target_storage>

# Restore with new VMID
vzrestore <new_vmid> <backup_file> --storage <target_storage>
```

### Verify Backup

```bash
# Check backup integrity
vzdump --verify <backup_file>

# List backup contents
vzdump --list-backup <storage_name>

# Check backup size
ls -lh /var/lib/vzdump/<backup_file>
```

## Verification

```bash
# Backup exists
ls -lh /var/lib/vzdump/ | grep <vmid>

# Backup integrity
vzdump --verify <backup_file>

# Restore test (optional)
vzrestore test-vm <backup_file> --storage <storage_name>
```

## Common Issues

### Backup Failed

**Symptoms:**
- vzdump returns error
- Incomplete backup file

**Resolution:**

```bash
# Check storage space
df -h

# Check VM status
qm status <vmid>

# Retry with different options
vzdump <vmid> --mode stop
```

### Restore Failed

**Symptoms:**
- vzrestore returns error
- VM won't start after restore

**Resolution:**

```bash
# Check backup integrity first
vzdump --verify <backup_file>

# Check available storage
df -h

# Try different restore options
vzrestore <vmid> <backup_file> --storage <storage_name> --format raw
```

## Rollback

```bash
# Remove failed backup
rm /var/lib/vzdump/<backup_file>

# Remove failed restore
qm destroy <vmid>
```

## Related Playbooks

- [[proxmox-vm-lxc-migration.md]] — VM migration after restore
- [[proxmox-storage-management.md]] — Storage configuration

## Notes

- Default backup location: /var/lib/vzdump/
- Use snapshot mode for production VMs
- Verify backups regularly

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
