# SSHFS Mounted Filesystem

Last edited time: May 5, 2023 4:55 PM
Owner: Jeremy Ingalls

# SSHFS Mounted Filesystem

## Introduction

SSHFS (Secure Shell File System) is a file system that enables you to mount a remote file system securely over an SSH connection. SSHFS can be used to access and manage files and directories on a remote system as if they were stored locally. This guide will provide detailed instructions for installing and configuring SSHFS on a Red Hat-based Linux distribution such as Alma Linux.

## Prerequisites

Before proceeding with the installation, ensure that you have the following:

- A Red Hat-based Linux distribution such as Alma Linux
- A user account with sudo privileges
- SSH access to a remote system

## Installation

To install SSHFS on a Red Hat-based Linux distribution such as Alma Linux, follow the steps below:

1. Open the terminal on your local machine by pressing `Ctrl + Alt + T`.
2. Update the package list by running the following command:
    
    ```
    sudo dnf update
    
    ```
    
3. Install the SSHFS package by running the following command:
    
    ```
    sudo dnf install sshfs
    
    ```
    
4. Verify that SSHFS has been installed successfully by running the following command:
    
    ```
    sshfs --version
    
    ```
    

## Configuration

Once SSHFS has been installed, you can mount a remote file system by following the steps below:

1. Create a directory on your local machine where you want to mount the remote file system. For example, create a directory named `remote_mount` in your home directory by running the following command:
    
    ```
    mkdir ~/remote_mount
    
    ```
    
2. Mount the remote file system by running the following command:
Replace `username` with your remote system username, `remote_host` with the IP address or hostname of the remote system, and `/remote_directory` with the path to the remote directory you want to mount. The `~/remote_mount` directory you created in step 1 will now be the mount point for the remote file system.
    
    ```
    sshfs username@remote_host:/remote_directory ~/remote_mount
    
    sshfs st31945@ds:/home/st31945/domains/ds.9xc.io/Plex /export/ds
    sshfs root@pct:/export/media/Library /export/media/Library
    ```
    
3. You can now access and manage the files on the remote system as if they were stored locally. To unmount the remote file system, run the following command:
    
    ```
    umount ~/remote_mount
    
    ```
    

To tell SSHFS to automatically remount if the connection is lost, you can use the `reconnect` option. When you mount the remote file system, include the `-o reconnect` option to enable automatic reconnection. For example, the mount command would look like this:

```
sshfs -o reconnect username@remote_host:/remote_directory ~/remote_mount

```

With this option enabled, SSHFS will automatically attempt to reconnect to the remote system if the connection is lost, without the need for manual intervention.

To add an SSHFS volume to your system's file system table (fstab), you can follow these steps:

1. Create a backup of the original fstab file by running the following command:
    
    ```
    sudo cp /etc/fstab /etc/fstab.bak
    
    ```
    
2. Open the fstab file in your preferred text editor. For example:
    
    ```
    sudo nano /etc/fstab
    
    ```
    
3. Add the following line at the end of the file to mount the remote file system:
    
    ```
    sshfs#username@remote_host:/remote_directory /local_mount_point fuse.sshfs defaults,_netdev,user,idmap=user,IdentityFile=/path/to/private/key 0 0
    
    st31945@ds:/home/st31945/domains/ds.9xc.io/storage/Plex /export/ds fuse.sshfs auto,user,reconnect,uid=777,gid=777,idmap=none,allow_other,IdentityFile=/root/.ssh/id_rsa 0 0
    ```
    
    Replace `username` with your remote system username, `remote_host` with the IP address or hostname of the remote system, and `/remote_directory` with the path to the remote directory you want to mount. Replace `/local_mount_point` with the path to the directory where you want to mount the remote file system on your local system. The `defaults,_netdev,user,idmap=user,IdentityFile=/path/to/private/key` options are used to configure SSHFS to mount the remote file system.
    
4. Save and close the fstab file.
5. Test the new mount point by running the following command:
    
    ```
    sudo mount -a
    
    ```
    
    This will mount all file systems specified in the fstab file.
    

Now, the remote file system will be mounted automatically at boot time, and can be accessed and managed as if it were stored locally. To unmount the remote file system, run the following command:

```
sudo umount /local_mount_point

```

Where `/local_mount_point` is the mount point you specified in the fstab file.

## Conclusion

In this guide, we provided detailed instructions for installing and configuring SSHFS on a Red Hat-based Linux distribution such as Alma Linux. With SSHFS, you can mount a remote file system securely over an SSH connection and access and manage files on the remote system as if they were stored locally.

Additionally, we provided steps for automatically remounting the remote file system if the connection is lost using the `reconnect` option, and for adding an SSHFS volume to your system's file system table (fstab) to mount the remote file system automatically at boot time.