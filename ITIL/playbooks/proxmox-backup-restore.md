# Proxmox Backup and Restore

## Overview

Complete playbook for Proxmox VE backup operations including configuration, verification, and disaster recovery procedures.

---

## 1) Configure Backup Repository

### Local Backup Storage

```bash
# Create backup directory
sudo mkdir -p /var/lib/vz/dump

# Or use dedicated backup disk
sudo mkdir -p /mnt/proxmox-backup
sudo chmod 700 /mnt/proxmox-backup
```

### Remote Backup Server (Proxmox Backup Server)

```bash
# On Proxmox VE node, add PBS repository
pvesm add dir backup \
  --path /path/to/backup \
  --content images,rootdir,archive \
  --server pbs.yourdomain.com \
  --port 8007 \
  --username root@pam \
  --password <password>
```

### Verify Storage

```bash
# List all storage
pvesm status

# Check available space
df -h /var/lib/vz/dump
```

---

## 2) Configure Scheduled Backups

### Via Web Interface

1. Go to **Datacenter → Backup**
2. Click **Add** → **Backup Job**
3. Configure:
   - **Mode:** snapshot or stop
   - **Storage:** backup storage ID
   - **Schedule:** cron expression (e.g., `0 2 * * *` for daily at 2 AM)
   - **Retention:** number of backups to keep

### Via CLI (pvesh)

```bash
# Create backup job via API
pvesh create /cluster/backup \
  --jobid <job_id> \
  --storage backup \
  --mode snapshot \
  --compress zstd \
  --maxfiles 7
```

### Via Configuration File

```bash
sudo vim /etc/pve/cron.cfg
```

Add:
```yaml
# Daily backup at 2 AM
0 2 * * * root /usr/bin/vzdump --mode snapshot --storage backup --compress zstd
```

---

## 3) Manual Backup Operations

### Backup a Single VM

```bash
# Backup VM ID 100
vzdump 100 \
  --mode snapshot \
  --storage backup \
  --compress zstd \
  --numjobs 4
```

### Backup Multiple VMs

```bash
# Backup VMs 100, 101, 102
vzdump 100 101 102 \
  --mode snapshot \
  --storage backup \
  --compress zstd
```

### Backup All VMs on Node

```bash
vzdump \
  --mode snapshot \
  --storage backup \
  --compress zstd \
  --exclude-lxc
```

### Backup LXC Containers Only

```bash
vzdump \
  --mode snapshot \
  --storage backup \
  --lxc-only
```

---

## 4) Backup Verification

### Check Backup Integrity

```bash
# List all backups
ls -lh /var/lib/vz/dump/

# Check specific backup
zstd -l /var/lib/vz/dump/vzdump-backup-*.zst

# Verify backup archive
proxmox-backup-client verify \
  --store backup \
  --snapshot <snapshot-id>
```

### Test Restore to Temporary Location

```bash
# Restore to test directory
vzdump-restore \
  --target /tmp/test-restore \
  /var/lib/vz/dump/vzdump-backup-*.vma.gz
```

### Monitor Backup Logs

```bash
# View backup job logs
tail -f /var/log/pve/tasks/log

# Search for errors
grep -i "error\|fail" /var/log/pve/tasks/log | tail -20
```

---

## 5) Disaster Recovery: Restore VM/Container

### Restore from Web Interface

1. Go to **Datacenter → Backup**
2. Select backup file
3. Click **Restore**
4. Choose destination storage
5. Configure restore options:
   - **Restore to:** original or new VM ID
   - **Full restore:** yes/no
   - **Overwrite:** if target exists

### Restore via CLI

```bash
# List available backups
vzdump-list /var/lib/vz/dump/

# Restore specific backup
restore-vzdump \
  /var/lib/vz/dump/vzdump-backup-100-2024_03_05-02_00_00.vma.gz \
  --target-storage backup \
  --remove-file
```

### Restore to Different Host

```bash
# Backup on source host
vzdump 100 --mode stop --storage local-backup

# Transfer backup file
scp /var/lib/vz/dump/vzdump-backup-100*.vma.gz user@target-host:/tmp/

# Restore on target host
restore-vzdump /tmp/vzdump-backup-100*.vma.gz \
  --target-storage remote-storage
```

---

## 6) Incremental Backup Setup

### Enable Incremental Backups

```bash
# Configure incremental mode
sudo vim /etc/vzdump.conf
```

Add:
```conf
# Enable incremental backups for containers
incmode = 1
```

### Verify Incremental Chain

```bash
# List backup chain
proxmox-backup-client list \
  --store backup \
  --group <backup-group>

# Check backup chain integrity
proxmox-backup-client check \
  --store backup \
  --snapshot <snapshot-id>
```

---

## 7) Backup Retention Policy

### Automatic Cleanup via Cron

```bash
sudo vim /etc/cron.d/proxmox-backup-retention
```

Add:
```bash
# Keep 7 daily, 4 weekly, 1 monthly backup
0 3 * * * root /usr/bin/proxmox-backup-client prune \
  --store backup \
  --keep-daily 7 \
  --keep-weekly 4 \
  --keep-monthly 1
```

### Manual Retention Cleanup

```bash
# Keep only last 3 backups
find /var/lib/vz/dump -name "vzdump-*.gz" -printf '%T@ %p\n' | \
  sort -n | head -n -3 | cut -d' ' -f2- | xargs rm -f
```

---

## 8) Success Criteria

- ✅ Daily backups complete without errors
- ✅ Backup size < expected VM size (due to compression)
- ✅ Retention policy enforced (old backups deleted)
- ✅ Restore tested successfully (quarterly)
- ✅ Backup logs show no critical errors

---

## 9) Escalation Data to Collect

If backup/restore fails:

1. **Backup job logs:**
   ```bash
   cat /var/log/pve/tasks/log | grep vzdump
   ```

2. **Storage status:**
   ```bash
   pvesm status
   df -h
   ```

3. **VM/container status:**
   ```bash
   qm list
   pct list
   ```

4. **Error messages from vzdump output**

5. **Network connectivity to backup server:**
   ```bash
   ping pbs.yourdomain.com
   telnet pbs.yourdomain.com 8007
   ```

---

## Related Issues

- [ITIL-CHANGE-USM1-KERNEL-CONSTRAINT.md](../ITIL-CHANGE-USM1-KERNEL-CONSTRAINT.md) - usm1 kernel lock
- [ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER.md](../ITIL-ISSUE-CONTEXT-WINDOW-ROLLOVER.md) - context overflow

---

**Owner:** Sam (ops butler AI)  
**Last Updated:** 2026-03-05 04:21 UTC  
**Status:** Ready for deployment