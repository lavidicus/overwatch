#!/bin/bash
# Setup 1TB disk mount for /home/localadmin/.openclaw/workspace/projects
# Run inside claw VM (VMID 226 on TS)

set -e

echo "=== Setting up 1TB disk mount ==="

# Step 1: Check if disk exists and is accessible
echo "[1/5] Checking for 1TB disk..."
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT | grep -E "1T|931G|1000G" || {
    echo "ERROR: Could not find 1TB disk"
    exit 1
}

# Step 2: Identify the disk (likely /dev/sdb or /dev/vdb)
DISK=$(lsblk -o NAME,SIZE,TYPE | grep -E "1T|931G|1000G" | grep disk | awk '{print $1}' | head -1)
if [ -z "$DISK" ]; then
    echo "ERROR: Could not identify disk name"
    exit 1
fi
echo "Found disk: /dev/$DISK"

# Step 3: Check if already formatted
echo "[2/5] Checking disk format..."
PARTITION="/dev/${DISK}1"
if ! blkid "$PARTITION" > /dev/null 2>&1; then
    echo "Disk not formatted. Formatting as ext4..."
    mkfs.ext4 -L projects "$PARTITION"
else
    echo "Disk already formatted"
    blkid "$PARTITION"
fi

# Step 4: Create mount point
echo "[3/5] Creating mount point..."
mkdir -p /home/localadmin/.openclaw/workspace/projects

# Step 5: Get UUID for fstab
UUID=$(blkid -s UUID -o value "$PARTITION")
echo "[4/5] Disk UUID: $UUID"

# Step 6: Update fstab
echo "[5/5] Updating /etc/fstab..."
# Remove any old projects mount entries
sed -i '/\/home\/localadmin\/.openclaw\/workspace\/projects/d' /etc/fstab
# Add new entry
echo "UUID=$UUID /home/localadmin/.openclaw/workspace/projects ext4 noatime,discard,nofail 0 2" >> /etc/fstab

# Step 7: Mount the disk
echo "Mounting disk..."
mount /home/localadmin/.openclaw/workspace/projects

# Step 8: Verify
echo "=== Verification ==="
df -h /home/localadmin/.openclaw/workspace/projects
mount | grep projects

echo ""
echo "✅ Setup complete!"
echo "The 1TB disk is now mounted at /home/localadmin/.openclaw/workspace/projects"
