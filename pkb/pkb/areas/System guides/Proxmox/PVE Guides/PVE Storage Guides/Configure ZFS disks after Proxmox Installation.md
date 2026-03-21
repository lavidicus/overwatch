## Post-Proxmox Installation ZFS Configuration Guide

This document details the steps required to fully configure ZFS after a Proxmox installation, specifically focusing on utilizing NVMe drives for caching and logging to improve performance. This guide assumes a Proxmox installation utilizing ZFS RAID-Z.

**Prerequisites:**

*   A Proxmox installation utilizing ZFS RAID-Z.
*   Access to the Proxmox shell (via SSH or the Proxmox web interface console).
*   An NVMe drive available for use as a cache and log device.

**Important Note:**  Incorrectly following these steps could lead to data loss. Ensure you understand each step before proceeding.



### 1. Understanding the Initial Partitioning

Proxmox installations with ZFS RAID-Z create bootable partitions and leave usable space unallocated.  Each drive (e.g., /dev/sda, /dev/sdb, etc.) will typically have the following partitions:

```
Device       Start       End     Sectors   Size Type
/dev/sda1     34          2047    2014     1007K BIOS boot
/dev/sda2     2048        2099199  2097152  1G EFI System
/dev/sda3     2099200    67108864  65009665  31G Solaris /usr & Apple ZFS
```

These partitions are automatically created.  The goal is to create a fourth partition on each disk to utilize the remaining space.



### 2. Creating the Fourth Partition on Each Disk

This step involves using `fdisk` to create a fourth partition on each of your ZFS disks.  Repeat this process for each disk (e.g., /dev/sda, /dev/sdb, /dev/sdc, etc.).

**2.1.  Open `fdisk` for the disk:**

```bash
fdisk /dev/sda  # Replace /dev/sda with the appropriate disk identifier
```

**2.2.  Create a new partition:**

*   Press `n` to create a new partition.
*   Select partition type: Press `p` for primary.
*   Partition number: Accept the default (usually 4).
*   First sector: Accept the default.
*   Last sector: Accept the default (this will use all remaining space).

**2.3.  Write the changes:**

*   Press `w` to write the changes to the disk.  **WARNING:** This will make changes to your disk.

**2.4. Repeat for all ZFS disks.**



### 3. Configuring the NVMe Drive for Cache and Log

This section details partitioning the NVMe drive and adding it to the ZFS pool.

**3.1. Partitioning the NVMe Drive:**

Use `fdisk` to partition the NVMe drive.

```bash
fdisk /dev/nvme0n1 # Replace /dev/nvme0n1 with your NVMe drive identifier
```

Create two partitions:

*   **Partition 1 (Cache):**  Create a partition of approximately 256GB.
*   **Partition 2 (Log):** Create a partition of approximately 12GB.

Follow these steps within `fdisk`:

1.  Press `n` to create a new partition.
2.  Select partition type: Press `p` for primary.
3.  Partition number: 1
4.  First sector: Accept the default.
5.  Last sector:  Enter `+256G` (for the cache partition).
6.  Press `n` to create a new partition.
7.  Select partition type: Press `p` for primary.
8.  Partition number: 2
9.  First sector: Accept the default.
10. Last sector: Accept the default (this will use the remaining space).

**3.2. Write the changes:**

*   Press `w` to write the changes to the disk. **WARNING:** This will make changes to your disk.



### 4. Adding Cache and Log Devices to the ZFS Pool

Now, add the newly created NVMe partitions to the ZFS pool.  The pool name is typically `rpool`.

```bash
zpool add rpool cache /dev/nvme0n1p1
zpool add rpool log /dev/nvme0n1p2
```

**Note:** Replace `/dev/nvme0n1p1` and `/dev/nvme0n1p2` with the correct partition identifiers if they differ on your system.



### 5. Optimizing ZFS Sync

Disable ZFS sync to improve write performance.  This is generally recommended for NVMe-based ZFS setups.

```bash
zfs set sync=disabled rpool
zfs set sync=disabled mas
```

**Important Considerations:**

*   Disabling sync can increase the risk of data loss in the event of a power failure or system crash.  Consider the implications before disabling sync.



### 6. Verification

Verify the changes by checking the ZFS pool status:

```bash
zpool status rpool
```

This command will show the pool's health, capacity, and the added cache and log devices.



### Example Partitioning Output (NVMe Drive)

The following is an example of what the partitioning output might look like:

```
Device       Start       End     Sectors   Size Type
/dev/nvme0n1p1 562038784 587204607 25165824 12G Linux filesystem
/dev/nvme0n1p2 587204608 1124075519 536870912 256G Linux filesystem
```

**Disclaimer:** This guide provides general instructions. Specific commands and partition identifiers may vary depending on your system configuration. Always double-check commands before executing them. Data loss is possible if these instructions are followed incorrectly.  Back up your data before making any changes to your ZFS configuration.### 1. Configure ZFS disks after Proxmox Installation