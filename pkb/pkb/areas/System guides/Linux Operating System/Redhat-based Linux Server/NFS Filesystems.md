# NFS Filesystems

Last edited time: April 28, 2023 11:12 AM
Owner: Jeremy Ingalls

# NFS Filesystems

To install and configure NFS and share the directories FS1:/export/fs1 and FS2:/export/fs2, and configure FS0 to mount them to /export, follow these steps on Red Hat-based systems:

1. Install the NFS package by running the following command:
    
    ```
    sudo yum install nfs-utils
    
    ```
    
2. Create the directories that you want to share on FS1 and FS2:
    
    ```
    sudo mkdir -p /export/fs1
    sudo mkdir -p /export/fs2
    
    ```
    
3. Configure the /etc/exports file to allow clients to mount the directories:
    
    ```
    sudo vi /etc/exports
    
    ```
    
    Add the following lines at the end of the file:
    
    ```
    /export/fs1 *(rw,sync,no_subtree_check)
    /export/fs2 *(rw,sync,no_subtree_check)
    
    ```
    
    Save and close the file.
    
4. Start the NFS service:
    
    ```
    sudo systemctl start nfs-server
    
    ```
    
5. Configure the NFS service to start automatically at boot time:
    
    ```
    sudo systemctl enable nfs-server
    
    ```
    
6. On FS0, create the mount point and mount the directories from FS1 and FS2:
    
    ```
    sudo mkdir -p /export/fs1
    sudo mkdir -p /export/fs2
    sudo mount -t nfs FS1:/export/fs1 /export/fs1
    sudo mount -t nfs FS2:/export/fs2 /export/fs2
    
    # FS1
    sudo mount -t nfs FS2:/export/fs2 /export/fs2
    
    # FS2
    sudo mount -t nfs FS1:/export/fs1 /export/fs1
    ```
    
7. Verify that the directories are mounted:
    
    ```
    df -h
    
    ```
    
    You should see the following output:
    
    ```
    FS1:/export/fs1    10G   0G   10G   0%   /export/fs1
    FS2:/export/fs2    10G   0G   10G   0%   /export/fs2
    
    ```
    

To set up `/etc/fstab` to mount the NFS shares on boot time, follow these steps:

1. Edit the `/etc/fstab` file using your preferred text editor:
    
    ```
    sudo vi /etc/fstab
    
    ```
    
2. Add the following lines at the end of the file:
    
    ```
    FS1:/export/fs1    /export/fs1    nfs    defaults    0    0
    FS2:/export/fs2    /export/fs2    nfs    defaults    0    0
    
    ```
    
3. Save and close the file.
4. To test the `/etc/fstab` configuration, run the following command:
    
    ```
    sudo mount -a
    
    ```
    
5. Verify that the directories are mounted:
    
    ```
    df -h
    
    ```
    
    You should see the following output:
    
    ```
    FS1:/export/fs1    10G   0G   10G   0%   /export/fs1
    FS2:/export/fs2    10G   0G   10G   0%   /export/fs2
    
    ```