
## Creating Bootable Disk Mirrors in DiskPart

```js
# Prepare the new mirror disk/LUN

DISKPART>list disk 
DISKPART>Select disk <?>                          # Select mirrored disk/LUN.
DISKPART>clean
DISKPART>DISKPART> ATTRIBUTES DISK CLEAR READONLY # Remove R/O Attributes for DISK/LUN.
DISKPART>Convert DYNAMIC 
DISKPART>List Partition                           # Check for any new partitions 
DISKPART> Select Partition 1                      # Remove any partitions from mirror. 
DISKPART> DELETE PARTITION OVERRIDE               # Enforce Override 

# Record the partition sizes from the Master Disk/LUN
DISKPART> Select Disk <?>                         # Select Master Disk/LUN
DISKPART> List Partition

DISKPART> list part

  Partition ###  Type              Size     Offset
  -------------  ----------------  -------  -------
  Partition 1    Recovery           499 MB  1024 KB
  Partition 2    System              99 MB   500 MB
  Partition 5    Dynamic Reserved  1024 KB   599 MB
  Partition 3    Reserved            15 MB   600 MB
  Partition 4    Dynamic Data        99 GB   615 MB
  Partition 6    Dynamic Data      1007 KB    99 GB
```


```js
# Prepare the Boot Partitions
DISKPART>Select disk <?>                       # Select the mirrored disk/LUN. 
DISKPART>Create partition primary size=499     # match size from master EFI partition. 
DISKPART>Format quick fs=ntfs label="WinRE"
DISKPART>set id="de94bba4-06d1-4d40-a16a-bfd50179d6ac"
DISKPART>Create partition efi size=99
DISKPART>create partition msr size=16


# Convert both disks to Dynamic 
DISKPART> Select Disk 0
DISKPART> Convert Dynamic
----
DISKPART> Select Disk 1
DISKPART> Convert Dynamic
----
# Create the mirror set: 
DISKPART>Select Disk <?>                       # Select Master Disk/LUN
DISKPART>Select Volume C
DISKPART>Add Disk=<?>                          # Add Mirror Disk/LUN
----
```


```js
# Wait until Resynching has completed and boot server from installation media

# Boot from the Installation DVD
1. At the Language Selection Screen: Press Shift+F10
2. Run DISKPART
----
DISKPART>Select Disk <?>                     # Select the Mirror Disk/LUN
DISKPART> import / online                    # Import or Online the Disk.

# Copy the EFI partition from Master to Mirror
DISKPART>Select partition <?>                  # Select the Mirror EFI partition.
DISKPART>Assign Letter=S                       # Provide a drive letter for formating.
DISKPART>Select Disk <?>                       # Select Master / Disk/LUN. 
DISKPART>Select Partition <?>                  # Select Master EFI Partition
DISKPART>Assign Letter=P                       # Assign drive letter to copy files.
DISKPART>Exit
C:\> format s: /fs:fat /q /y                   # EFI boot requires Fat filesystem.
C:\> xcopy p:\*.* s: /s /h                     # Copy EFI from Master to Mirror.

# Configure Boot Entries with BCDEDIT.EXE

# Copy the current Boot Manager so the EFI Startup can use either Disk for boot.

1. S:                                          # Change drive to Master EFI
2. cd EFI\Microsoft\Boot                       # Change Directory to Boot Folder.
# Clone the Boot Manager
3. C:\> bcdedit /copy {bootmgr} /d "Windows Boot Manager Cloned"
	
# If sucessfull the response will include the GUID of the device partition: 
	The entry was successfully copied to {6fb37507-3d6b-11ea-914e-85f8d8cf8c72}.

4. bcdedit /set {GUID} device partition=<?>:   # Select Mirror EFI Volume (P:)
5. bcdedit /export <?>:\EFI\Microsoft\Boot\BCD # Export BCD Store / copy to (P:)

# Remove the drive letters assigned to both EFI partitions.

DISKPART> Select volume S                      # Select Master EFI Volume
DISKPART> Remove                               # Remove assignment from Mirror Disk/LUN.
DISKPART> Select Volume P                      # Select Mirror EFI Volume
DISKPART> Remove                               # Remove assignment from Master Disk/LUN. 

----

# Import the BCD Store to the new EFI Mirror partition.
1. C:\>bcdedit /store n:\EFI\Microsoft\Boot\BCD

# Install Notes:
DISK0=VMWARE - DISK ID: (DFa44)
DISK1=QNAP - DISK ID: (C2C5A)

Server was installed on QNAP disk, Mirror should be Disk 0 
DISK0/PART2=P:
DISK1/PART2=S: (ORIGINAL INSTALLATION DRIVE)

# Command Notes

#bootrec Notes
bootrec /ScanOS – Scans for compatible OSes.
bootrec /FixMbr – Writes a new master boot record to the HDD or SSD.
bootrec /FixBoot – Writes a new boot sector to the OS partition.
bootrec /RebuildBcd – Scans for compatible Windows installs and creates a new boot loader.
----
# DISKPART ATTRIBUTES 
DISKPART>ATTRIBUTES DISK [SET | CLEAR] [READONLY]
DISKPART>ATTRIBUTES VOLUME [SET | CLEAR] 
# OTHER OPTIONS: [HIDDEN | READONLY | NODEFAULTDRIVELETTER | SHADOWCOPY] [NOERR]
----

# DELETING DISKS 
DISKPART> list disk
DISKPART> Select Disk <?>                      # [0-9],M[0-9]
DISKPART> Delete Disk OVERRIDE

# Creating RAID 5 Disk

DISKPART> list Disk                      # List disks available (3 required for Raid 5)
DISKPART> Select Disk <?>                # Select 1st RAID Disk.
DISKPART> Convert Dynamic                # Convert to Dynamic Disk
# Repeat for each Disk in the Raid Array
----
DISKPART> List Disk                      # All Disks should have a * under DYN Column.
# Setup the Striped Arrary
DISKPART> Select Disk 0
DISKPART> create volume stripe disk=0,1,2,3
DISKPART>format fs=ntfs label="LABEL"
DISKPART> Assign Letter=<?>              # Set the Drive Letter

# Website Sources:
1. https://learn.microsoft.com/en-us/troubleshoot/windows-server/backup-and-storage/establish-boot-to-gpt-mirrors
2. https://learn.microsoft.com/en-us/troubleshoot/windows-server/backup-and-storage/set-up-dynamic-boot-partition-mirroring

