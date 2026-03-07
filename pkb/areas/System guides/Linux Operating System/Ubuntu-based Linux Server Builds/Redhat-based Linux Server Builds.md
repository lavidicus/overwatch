# Redhat-based Linux Server Builds

Last edited time: June 14, 2023 3:20 PM
Owner: Jeremy Ingalls
Tags: RedHat-based Linux

# Rocky Linux Minimal Server Build

To install the basic packages needed for a minimal install of Rocky Linux 8, follow these steps:

1. Start by updating the system:
    
    ```
    sudo dnf update
    
    ```
    
    This will update the system to the latest available packages.
    
2. Install the minimal package group:
    
    ```
    sudo dnf install @minimal-environment
    
    ```
    
    This will install the minimal package group for Rocky Linux 8, which includes only the essential packages needed for a basic system.
    
3. Install the EPEL repository for additional packages:
    
    ```
    sudo dnf install epel-release
    
    ```
    
    This will install the EPEL repository, which provides additional packages that are not available in the default Rocky Linux repositories.
    
4. Install some useful tools:
    
    ```
    sudo dnf install sshfs wget curl net-tools bind-utils
    
    ```
    
    This will install some useful tools that are commonly needed on a Linux system, including the Nano text editor, the wget file downloader, the curl data transfer tool, the net-tools package for network utilities, and the bind-utils package for DNS utilities.
    
5. Disable SELinux:
    
    ```
    sudo sed -i 's/SELINUX=enforcing/SELINUX=disabled/g' /etc/selinux/config
    sudo setenforce 0
    
    ```
    
    This will disable SELinux, which is a security feature that can sometimes cause issues with certain applications. Disabling SELinux is not recommended for production systems, but it can be helpful for testing or development purposes.
    
6. Reboot the system:
    
    ```
    sudo reboot
    
    ```
    
    This will reboot the system and apply any changes that have been made. After the system has rebooted, you should have a minimal install of Rocky Linux with some useful tools installed.
    

After completing these steps, you can further configure the system to meet your specific needs. For example, you may want to install additional packages or configure network settings. Rocky Linux is a Red Hat-based Linux distribution, so many of the same tools and techniques that work on Red Hat Enterprise Linux (RHEL) will also work on Rocky Linux.

[Reallocate free space for new volume group](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Reallocate%20free%20space%20for%20new%20volume%20group%20415a6147e602472bb5a54bf924e452df.md)

[Chrony Time Service](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Chrony%20Time%20Service%201988862da38041fdb380a9c62313e50e.md)

[Linux Net Tools](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Linux%20Net%20Tools%20b38d3d50af674b1795af758c10b5d37f.md)

[Linux Firewalld](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Linux%20Firewalld%2074eb871fcddb4626b5400fae4046c48d.md)

[Linux Samba/CIFS](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Linux%20Samba%20CIFS%202ce1372c5afe4aaa91a33cfeadee78bf.md)

[Gluster FileSystems](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Gluster%20FileSystems%20f54dd2b04f1a47adab0958ec7a387438.md)

[IP Security (IPSEC)](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/IP%20Security%20(IPSEC)%20e207080a5aef4145be4bd3fa433ddd70.md)

[Fail2Ban](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Fail2Ban%20d4e403dc214548559a5f8d0578083851.md)

[Rsync](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Rsync%20263cd431a7b7472bbda1cf8176abcf65.md)

[Docker Containers](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Docker%20Containers%2076a241fffa3b4914a932678ab2bd055a.md)

[Adding Users in Linux](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Adding%20Users%20in%20Linux%2007167b0a790a449198714b9d34ee6222.md)

[Using Labeled Encoding on Redhat and Ubuntu Linux](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Using%20Labeled%20Encoding%20on%20Redhat%20and%20Ubuntu%20Linux%202802013af3a849bd9d40ca54ec3af8a0.md)

[Set MTU on Wireless device](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Set%20MTU%20on%20Wireless%20device%20373003963e8f434f8d7f0a7f2f96f7be.md)

[NFS Filesystems](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/NFS%20Filesystems%204e0ce9a4dfc241ad8cdd32bcdf14aa42.md)

[SSHFS Mounted Filesystem](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/SSHFS%20Mounted%20Filesystem%20d94be2255c964e0da644bff1c6077902.md)

[Mount Windows WSL Host Share](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Mount%20Windows%20WSL%20Host%20Share%20be08dceec3c5476bb6f761439b26e79f.md)

[Managing DHCP](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Managing%20DHCP%202bbc8246e1be4b29a4832b2d93ee803a.md)

[Change Hostname](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Change%20Hostname%20425573b6c5f14ef4b4f75fcb1fc131c2.md)

[Add user to SU Doers group](Redhat-based%20Linux%20Server%20Builds%20b83771d2dec94a30845355a0ff43218b/Add%20user%20to%20SU%20Doers%20group%2028ce49f6e43341f7b300c0289a4dfbcd.md)