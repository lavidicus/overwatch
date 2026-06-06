# VM Migration Plan: claw.9xc.io (VMID 226) MAS → TS

## Using Existing PVE Migration Tool

**Tool:** `/root/pve_guest_migrate.py` on TS (already battle-tested)
**Previous migrations:** VMID 105 (vh.9xc.io), VMID 220 (nvapi.9xc.io) ✅

---

## Current State (MAS)

- **VMID:** 226
- **Name:** claw.9xc.io
- **Type:** VM
- **Storage:** 
  - scsi0: local-zfs:vm-226-disk-0 (128G OS)
  - scsi1: mas:vm-226-disk-1 (2T data)
- **RAM:** 8GB
- **Cores:** 8
- **Network:** vmbr1, MAC BC:24:11:AF:23:5B

## Target State (TS)

- **VMID:** 226 (same)
- **Name:** claw
- **Storage:** RAID pool (9.5TB free)
- **Network:** vmbr0 (TS bridge)
- **IP:** 172.16.254.226/24
- **Hostname:** claw
- **FQDN:** claw.9xc.io

---

## Migration Command (Single Pull Operation)

**Run on TS (destination):**

```bash
ssh root@ts.9xc.local "/root/pve_guest_migrate.py pull \
  --source-host mas.9xc.io \
  --source-vmid 226 \
  --dest-vmid 226 \
  --dest-ip 172.16.254.226/24 \
  --dest-hostname claw \
  --dest-fqdn claw.9xc.io \
  --dest-bridge vmbr0 \
  --dest-storage RAID \
  --start-after-restore \
  --yes"
```

**What this does:**
1. Connects to MAS (source) from TS (destination)
2. Creates vzdump backup on MAS (offline, stops VM)
3. Transfers backup to TS via rsync (background, resumable)
4. Restores VM on TS with new network config
5. Starts VM automatically (`--start-after-restore`)

**Downtime:** Starts when VM is stopped for backup, ends when VM starts on TS
**Estimated time:** 1-6 hours (depends on 2TB transfer speed)

---

## Monitoring During Migration

**Check migration status:**
```bash
ssh root@ts.9xc.local "/root/pve_guest_migrate.py status --dest-vmid 226"
```

**Check rsync progress (live):**
```bash
ssh root@ts.9xc.local "/root/pve_guest_migrate.py rsync-status --dest-vmid 226"
```

**Watch rsync log:**
```bash
ssh root@ts.9xc.local "tail -f /mas/transfer/226/logs/rsync_pull.log"
```

**Attach to tmux session (if running):**
```bash
ssh root@ts.9xc.local "tmux attach -t rsync_pull_226"
```

**Wait for completion:**
```bash
ssh root@ts.9xc.local "/root/pve_guest_migrate.py rsync-wait --dest-vmid 226"
```

---

## Pre-Migration Checklist

- [ ] Verify TS has sufficient storage (RAID: 9.5TB free ✅)
- [ ] Test SSH between TS and MAS (no password prompt)
- [ ] Notify users of planned downtime
- [ ] Schedule maintenance window (2-6 hours)
- [ ] Backup critical data separately (optional but recommended)

---

## Migration Execution Steps

### Step 1: Run Pull Command (on TS)

```bash
ssh root@ts.9xc.local
/root/pve_guest_migrate.py pull \
  --source-host mas.9xc.io \
  --source-vmid 226 \
  --dest-vmid 226 \
  --dest-ip 172.16.254.226/24 \
  --dest-hostname claw \
  --dest-fqdn claw.9xc.io \
  --dest-bridge vmbr0 \
  --dest-storage RAID \
  --start-after-restore \
  --yes
```

**Note:** The rsync transfer runs in background tmux session. You can disconnect and reconnect to monitor.

### Step 2: Monitor Progress

```bash
# Check status
/root/pve_guest_migrate.py status --dest-vmid 226

# Check rsync progress
/root/pve_guest_migrate.py rsync-status --dest-vmid 226

# Or watch log
tail -f /mas/transfer/226/logs/rsync_pull.log
```

### Step 3: Verify After Completion

```bash
# Check VM is running
qm list | grep 226

# Test SSH
ssh localadmin@claw.9xc.io

# Verify services
systemctl status openclaw
systemctl status n8n
systemctl status gog-bridge
```

---

## Rollback Plan

**If migration fails mid-transfer:**
- Original VM on MAS is untouched (still stopped)
- Re-run pull command (rsync is resumable with `--partial --append-verify`)
- Or restart VM on MAS: `ssh root@mas.9xc.io "qm start 226"`

**If VM won't boot on TS:**
- Check config: `ssh root@ts.9xc.local "qm config 226"`
- Check logs: `ssh root@ts.9xc.local "tail -f /var/log/pve/tasks/*"`
- Revert: Destroy TS VM, restart on MAS

**Critical:** Original MAS disks remain intact until you manually delete them.

---

## Post-Migration Cleanup (After 24-48 Hours)

**Once TS VM is verified stable:**

```bash
# Remove old VM from MAS
ssh root@mas.9xc.io "qm destroy 226 --destroy-unreferenced-disks"

# Clean up transfer directories
ssh root@ts.9xc.local "rm -rf /mas/transfer/226"
ssh root@mas.9xc.io "rm -rf /mas/staging/226"
```

---

## Known Issues from SKILL.md

- **Bug:** Pull mode has undefined `ExitCode.PULL_LOCAL_STORAGE_REWRITE_IN_PROGRESS`
- **Workaround:** Manually update network config if script stops at storage rewrite stage
- **VMID collision check:** Script checks source host even in pull mode (use `--force` or remove existing guest first)

---

## Validation Result

✅ **Validation passed** for source VMID 226 → destination VMID 226
- Tested: 2026-05-07 00:07:57 UTC
- Command: `/root/pve_guest_migrate.py validate --source-host mas.9xc.io --source-vmid 226 --dest-vmid 226 --dest-ip 172.16.254.226/24 --dest-hostname claw --dest-fqdn claw.9xc.io --dest-bridge vmbr0 --dest-storage RAID`

---

## Summary

**Use the existing tool.** It's already proven, handles background transfers, and is resumable.

**One command to migrate:**
```bash
ssh root@ts.9xc.local "/root/pve_guest_migrate.py pull --source-host mas.9xc.io --source-vmid 226 --dest-vmid 226 --dest-ip 172.16.254.226/24 --dest-hostname claw --dest-fqdn claw.9xc.io --dest-bridge vmbr0 --dest-storage RAID --start-after-restore --yes"
```

**Monitor with:**
```bash
ssh root@ts.9xc.local "/root/pve_guest_migrate.py status --dest-vmid 226"
ssh root@ts.9xc.local "/root/pve_guest_migrate.py rsync-status --dest-vmid 226"
```
