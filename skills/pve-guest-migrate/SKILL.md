# pve-guest-migrate Skill

Proxmox guest migration helper for offline LXC/VM migrations between PVE nodes.

## Location

- **Script:** `/root/pve_guest_migrate.py` on TS (ssh root@ts.9xc.local)
- **Transfer staging:** `/mas/transfer/{DEST_VMID}/`
- **Remote staging:** `/mas/staging/{DEST_VMID}/`

## What It Does

Offline Proxmox guest migration with:
- LXC and VM discovery
- Destination validation (VMID, IP, hostname, FQDN, storage)
- Offline backup via `vzdump --mode stop --compress zstd`
- **Background rsync transfer via tmux** (resumable across disconnects, ideal for 1TB+ files)
- SHA-256 verification before restore
- Config rewrite for new network (bridge, VLAN, IP, hostname)
- Storage object naming correction on ZFS
- Optional start after restore

## Commands

Run on TS (ssh root@ts.9xc.local):

```bash
# Discover local guests
/root/pve_guest_migrate.py discover

# Discover guests on remote host
/root/pve_guest_migrate.py discover-remote --dest-host mas.9xc.io

# Validate migration plan (no changes made)
/root/pve_guest_migrate.py validate \
  --source-vmid 105 \
  --dest-ip 172.16.254.105/24 \
  --dest-hostname vh \
  --dest-fqdn vh.9xc.io \
  --dest-host mas.9xc.io

# Prepare savepoint (stops guest, creates backup)
/root/pve_guest_migrate.py prepare \
  --source-vmid 105 \
  --dest-ip 172.16.254.105/24 \
  --dest-hostname vh \
  --dest-fqdn vh.9xc.io \
  --dest-host mas.9xc.io \
  --yes

# Push savepoint to remote and restore
/root/pve_guest_migrate.py push \
  --dest-vmid 105 \
  --dest-host mas.9xc.io \
  --start-after-restore \
  --yes

# Pull guest FROM remote TO local (run on destination)
/root/pve_guest_migrate.py pull \
  --dest-vmid 105 \
  --dest-ip 172.16.254.105/24 \
  --dest-hostname vh \
  --dest-fqdn vh.9xc.io \
  --dest-host mas.9xc.io \
  --start-after-restore \
  --yes

# Check migration status
/root/pve_guest_migrate.py status --dest-vmid 105

# Check background rsync transfer status
/root/pve_guest_migrate.py rsync-status --dest-vmid 105

# Wait for background rsync to complete
/root/pve_guest_migrate.py rsync-wait --dest-vmid 105

# List savepoints
/root/pve_guest_migrate.py list
```

## Current State (as of 2026-05-04)

**Completed migrations:**
- ✅ VMID 105 (vh.9xc.io): MAS → TS, running on 172.16.254.105
- ✅ VMID 220 (nvapi.9xc.io): MAS → TS, running on 172.16.254.220

**Transfer directory:** `/mas/transfer/{VMID}/` (updated from `/SAS/transfer/`)

**Known issues:**
- Script has a bug in pull mode: references undefined `ExitCode.PULL_LOCAL_STORAGE_REWRITE_IN_PROGRESS`
- Workaround: Manually update network config after restore completes (script stops at storage rewrite stage)
- Script checks source host for VMID collisions even in pull mode (use `--force` or remove existing guest first)

**Background transfer notes:**
- rsync runs in detached tmux sessions (e.g., `rsync_254`, `rsync_pull_254`)
- Transfer state tracked in `/mas/transfer/{VMID}/metadata.json`
- Logs written to `/mas/transfer/{VMID}/logs/rsync.log` or `rsync_pull.log`
- Use `rsync-status` to check progress, `rsync-wait` to block until complete
- Transfers are resumable: `--partial --append-verify` ensures no data loss on interrupt

## Usage from Chat

```bash
# Prepare migration (runs in background - use tmux/screen for long operations)
ssh root@mas.9xc.io "tmux new -d -s migrate105 'python3 /root/pve_guest_migrate.py prepare --source-vmid 105 --dest-ip 172.16.254.105/24 --dest-hostname vh --dest-fqdn vh.9xc.io --dest-host ts --yes'"

# Pull guest FROM remote TO local (background mode - rsync now auto-backgrounds)
ssh root@ts.9xc.local "python3 /root/pve_guest_migrate.py pull --dest-vmid 105 --dest-ip 172.16.254.105/24 --dest-hostname vh --dest-fqdn vh.9xc.io --dest-host mas.9xc.io --yes"

# Check migration status (works while job runs in background)
ssh root@ts.9xc.local "python3 /root/pve_guest_migrate.py status --dest-vmid 105"

# Check background rsync transfer progress
ssh root@ts.9xc.local "python3 /root/pve_guest_migrate.py rsync-status --dest-vmid 105"

# Wait for background rsync to complete (blocks until done)
ssh root@ts.9xc.local "python3 /root/pve_guest_migrate.py rsync-wait --dest-vmid 105"

# Attach to running rsync log (live progress)
ssh root@ts.9xc.local "tail -f /mas/transfer/105/logs/rsync.log"

# Or attach to tmux session directly
ssh root@ts.9xc.local "tmux attach -t rsync_105"

# List available savepoints
ssh root@ts.9xc.local "python3 /root/pve_guest_migrate.py list"
```

**Note:** For large guests (>10GB), rsync now automatically runs in background tmux sessions. The script writes state to `/mas/transfer/{VMID}/metadata.json` so it can be monitored or resumed if interrupted. Use `rsync-status` to check progress without blocking, or `rsync-wait` to block until the transfer completes.

## Notes

- Run as root on source node (or destination for pull mode)
- Requires root SSH between nodes without password
- Guest is stopped during backup (offline migration)
- Destination VMID derived from last octet of dest IP (e.g., 172.16.254.105 → VMID 105)
- Config automatically rewritten for new bridge, VLAN, IP, hostname/FQDN
- Storage objects renamed to match dest_vmid convention on ZFS
- **Background rsync:** Large transfers run in detached tmux sessions, resumable with `--partial --append-verify`
- **Monitoring:** Use `rsync-status` for progress, check logs at `/mas/transfer/{VMID}/logs/`, or attach to tmux session
