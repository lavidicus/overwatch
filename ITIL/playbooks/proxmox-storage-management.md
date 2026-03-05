# Proxmox Storage Management

## Overview

Manage Proxmox VE storage backends including local storage, NFS, Ceph, ZFS, and iSCSI. Diagnose storage issues and optimize performance.

---

## 1) List and Monitor Storage

### View All Storage Configuration

```bash
# List all storage backends
pvesm status

# Detailed storage information
pvesm status --output-format json | jq '.[] | {id, type, content, available: .available}'
```

### Check Storage Usage

```bash
# Local storage
df -h /var/lib/vz

# All Proxmox storage
pvesm status | grep -E "^[a-z]|Total|free"
```

### Monitor I/O Performance

```bash
# I/O statistics (1-second intervals)
iostat -x 1

# Per-device stats
iostat -x 5 10

# Check for I/O wait
vmstat 1 10 | grep "wa"
```

---

## 2) Add Local Directory Storage

### Create Directory Storage

```bash
# Create backup directory
sudo mkdir -p /mnt/proxmox-storage/backups
sudo chown root:root /mnt/proxmox-storage/backups
sudo chmod 755 /mnt/proxmox-storage/backups

# Add to Proxmox via CLI
pvesm add dir local-backup \
  --path /mnt/proxmox-storage/backups \
  --content backup,iso,vztmpl

# Add via web interface:
# Datacenter → Storage → Add → Directory
```

### Add Local Storage for VMs

```bash
# Create storage for VM images
sudo mkdir -p /mnt/proxmox-storage/vm-images
sudo chown root:root /mnt/proxmox-storage/vm-images

pvesm add dir local-vmstorage \
  --path /mnt/proxmox-storage/vm-images \
  --content images,rootdir \
  --content-type dir
```

---

## 3) Add NFS Storage

### Configure NFS Server (if needed)

```bash
# Install NFS server
sudo apt-get install nfs-kernel-server

# Create export directory
sudo mkdir -p /srv/nfs/proxmox
sudo chown nobody:nogroup /srv/nfs/proxmox
sudo chmod 755 /srv/nfs/proxmox

# Configure exports
sudo vim /etc/exports
```

Add:
```bash
/srv/nfs/proxmox 192.168.1.0/24(rw,sync,no_subtree_check,no_root_squash)
```

Apply:
```bash
sudo exportfs -ra
sudo systemctl restart nfs-kernel-server
```

### Add NFS to Proxmox

```bash
# Via CLI
pvesm add nfs nfs-storage \
  --path /srv/nfs/proxmox \
  --server 192.168.1.100 \
  --export /srv/nfs/proxmox \
  --content images,iso,vztmpl

# Via web interface:
# Datacenter → Storage → Add → NFS
```

### Verify NFS Mount

```bash
# Check mount
mount | grep nfs

# Test read/write
sudo touch /mnt/nfs-storage/test-file
sudo rm /mnt/nfs-storage/test-file
```

---

## 4) Add ZFS Storage (Recommended for Production)

### Install ZFS

```bash
# Install ZFS packages
sudo apt-get install zfs-dkms zfs-utils

# Enable ZFS
sudo systemctl enable zfs-import
sudo systemctl start zfs-import
```

### Create ZFS Pool

```bash
# List available disks
lsblk

# Create ZFS pool (replace disk names)
sudo zpool create proxmox-zfs \
  /dev/sdb /dev/sdc \
  -m /mnt/proxmox-zfs \
  -o ashift=12 \
  -o compression=lz4 \
  -o dedup=off \
  -o sync=standard

# Create datasets for different content types
sudo zfs create proxmox-zfs/vm-images
sudo zfs create proxmox-zfs/backups
sudo zfs create proxmox-zfs/iso
sudo zfs create proxmox-zfs/templates
```

### Add ZFS to Proxmox

```bash
# Via CLI
pvesm add zfs proxmox-zfs \
  --pool proxmox-zfs/vm-images

# Via web interface:
# Datacenter → Storage → Add → ZFS
```

### ZFS Performance Tuning

```bash
# View ZFS pool status
zpool status proxmox-zfs

# Check ZFS properties
zfs get all proxmox-zfs

# Adjust ZFS ARC size (limit memory usage)
echo 'options zfs zfs_arc_max=4294967296' | sudo tee /etc/modprobe.d/zfs.conf
sudo update-initramfs -u
```

---

## 5) Add Ceph Storage (Hyper-Converged)

### Prerequisites

- 3+ Proxmox nodes
- Dedicated network for Ceph traffic
- SSD/NVMe for OSDs

### Initialize Ceph Pool

```bash
# Create Ceph pool via CLI
pvesh create /ceph/pools \
  --name ceph-pool \
  --pools 3 \
  --pg_num 64 \
  --pgp_num 64

# Add Ceph storage
pvesm add ceph ceph-storage \
  --content images,rootdir \
  --cephpool ceph-pool \
  --cephuser cephadmin \
  --clustername ceph
```

### Monitor Ceph Health

```bash
# Ceph cluster health
ceph -s

# Ceph pool status
ceph osd pool stats

# Ceph OSD status
ceph osd tree
```

---

## 6) Storage Migration

### Migrate VM to Different Storage

```bash
# Migrate VM 100 to new storage
qm migrate 100 \
  --target-storage new-storage \
  --online  # for running VMs
```

### Migrate LXC Container

```bash
# Migrate container 100
pct migrate 100 --target-storage new-storage
```

### Migrate Backup File

```bash
# Copy backup to new storage
rsync -av /var/lib/vz/dump/vzdump-backup-100*.vma.gz \
  /mnt/new-storage/dump/

# Update storage reference (if needed)
pvesm status
```

---

## 7) Storage Cleanup

### Remove Unused Storage

```bash
# List all storage
pvesm status

# Remove storage definition
pvesm remove local-backup

# Remove orphaned files
find /var/lib/vz/dump -name "*.vma.gz" -mtime +90 -delete
```

### Clean Up Old VM Images

```bash
# List old images
ls -lh /var/lib/vz/images/100/

# Remove old disk images (BE CAREFUL)
rm -f /var/lib/vz/images/100/vm-100-disk-1.old
```

### Compress Backup Archives

```bash
# Compress uncompressed backups
find /var/lib/vz/dump -name "*.vma" -exec gzip {} \;

# Recompress with better compression
zstd -19 /var/lib/vz/dump/vzdump-backup-*.vma
```

---

## 8) Troubleshooting Storage Issues

### Storage Not Available

```bash
# Check storage status
pvesm status

# Check if NFS is mounted
mount | grep nfs

# Check Ceph connectivity
ceph -s
```

### Disk Full

```bash
# Find large files
du -sh /var/lib/vz/* | sort -rh | head -10

# Remove old backups
find /var/lib/vz/dump -name "*.gz" -mtime +30 -delete

# Compress current backups
zstd -19 /var/lib/vz/dump/*.vma
```

### I/O Performance Degradation

```bash
# Check for I/O wait
vmstat 1 10 | grep "wa"

# Check disk latency
iostat -x 1 10 | grep -E "r_await|w_await"

# Check for slow queries
grep "slow query" /var/log/syslog
```

---

## 9) Success Criteria

- ✅ All storage backends show as "available" in `pvesm status`
- ✅ No disk full warnings
- ✅ I/O wait < 5% during normal operation
- ✅ Backup storage has adequate free space (>20%)
- ✅ Storage performance within expected range

---

## 10) Escalation Data to Collect

If storage issues persist:

1. **Storage status:**
   ```bash
   pvesm status --output-format json
   ```

2. **Disk usage:**
   ```bash
   df -hT
   ```

3. **I/O statistics:**
   ```bash
   iostat -x 5 10
   ```

4. **Storage backend logs:**
   ```bash
   tail -100 /var/log/syslog | grep -i "storage\|ceph\|zfs\|nfs"
   ```

5. **Ceph/ZFS specific:**
   ```bash
   ceph -s  # for Ceph
   zpool status  # for ZFS
   ```

---

**Owner:** Sam (ops butler AI)  
**Last Updated:** 2026-03-05 04:21 UTC  
**Status:** Ready for deployment