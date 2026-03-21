# Reallocate free space for new volume group

Last edited time: April 25, 2023 3:03 AM
Owner: Jeremy Ingalls

# Reallocate free space for new volume group

## Last edited time: April 23, 2023 4:45 PM

## Owner: Jeremy Ingalls

To shrink a 2TB drive and move free space to a new volume group in Linux, follow the steps below:

1. Identify the disk you want to shrink using the `lsblk` command. In this example, we will use `/dev/sdb`:
    
    ```
    $ lsblk
    
    ```
    
2. Unmount the partition you want to shrink. In this example, we will use `/dev/sdb1`:
    
    ```
    $ sudo umount /dev/sdb1
    
    ```
    
3. Shrink the partition using the `resize2fs` command. In this example, we will shrink the partition to 1TB:
    
    ```
    $ sudo resize2fs /dev/sdb1 10G
    
    example:	rescue # resize2fs /dev/vda1 10G
    ```
    
4. Shrink the partition using the `parted` command. In this example, we will shrink the partition to 1TB:
    
    ```
    $ sudo parted /dev/sdb
    (parted) resizepart 1 1000G
    
    ```
    
5. Create a new partition using the free space. In this example, we will create a new partition called `/dev/sdb2`:
    
    ```
    $ sudo parted /dev/sdb
    (parted) mkpart primary ext4 1000G 2000G
    
    ```
    
6. Create a new volume group using the new partition. In this example, we will create a new volume group called `newvg`:
    
    ```
    $ sudo vgcreate newvg /dev/sdb2
    
    ```
    
7. Create a new logical volume in the new volume group. In this example, we will create a new logical volume called `newlv`:
    
    ```
    $ sudo lvcreate -L 500G -n newlv newvg
    
    ```
    
8. Format the new logical volume as a file system. In this example, we will format the new logical volume as `ext4`:
    
    ```
    $ sudo mkfs.ext4 /dev/newvg/newlv
    
    ```
    
9. Mount the new logical volume to a directory of your choice. In this example, we will mount the new logical volume to `/mnt/newlv`:
    
    ```
    $ sudo mkdir /mnt/newlv
    $ sudo mount /dev/newvg/newlv /mnt/newlv
    
    ```
    

Your new volume group is now ready to use!