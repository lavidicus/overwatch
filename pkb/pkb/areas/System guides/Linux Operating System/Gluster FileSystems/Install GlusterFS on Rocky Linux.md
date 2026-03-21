# Install GlusterFS on Rocky Linux

Last edited time: April 28, 2023 12:14 AM
Owner: Jeremy Ingalls

# Install GlusterFS on Rocky Linux

GlusterFS is a distributed file system that can scale out in multiple directions. It is designed to provide a single namespace that spans multiple disks, servers, and data centers.

## Prerequisites

Before you start installing GlusterFS, make sure your system is up-to-date by running the following command:

```
sudo dnf -y update 

```

## Install GlusterFS

To install GlusterFS on Rocky Linux, follow these steps:

1. Enable the following repository and install python3-pyxattr:

```
sudo dnf -y --enablerepo=powertools install python3-pyxattr
sudo dnf -y install centos-release-gluster

```

1. Install GlusterFS packages:

```
sudo dnf -y install glusterfs glusterfs-fuse glusterfs-server

```

1. Start and enable the GlusterFS service:

```
sudo systemctl start glusterd
sudo systemctl enable glusterd

```

1. Verify that the GlusterFS service is running:

```
sudo systemctl status glusterd

```

## Configure firewalld

By default, firewalld blocks all incoming traffic. To allow GlusterFS peers to communicate, you need to add the required ports to the firewalld rules. Follow these steps to configure firewalld:

1. Allow the GlusterFS ports:

```
sudo firewall-cmd --add-port=24007/tcp --permanent
sudo firewall-cmd --add-port=24008/tcp --permanent
sudo firewall-cmd --add-port=24009/tcp --permanent
sudo firewall-cmd --add-port=49152-49251/tcp --permanent
sudo firewall-cmd --reload

```

1. Allow the required RPC services:

```
sudo firewall-cmd --add-service=rpc-bind --permanent
sudo firewall-cmd --add-service=nfs --permanent
sudo firewall-cmd --add-service=mountd --permanent
sudo firewall-cmd --reload

```

Now your peers should be able to communicate with each other.

## Configure GlusterFS

After installing GlusterFS, you need to configure the storage volumes. Follow these steps to configure GlusterFS:

1. Create a directory for storing GlusterFS volumes:

```
sudo mkdir -p /cots/glusterfs

```

1. Add your nodes to the trusted pool to allow them to communicate with each other:
2. On Node#1 add the IP address of its Peer (Node#2) and do the same for Node#2:

```
sudo gluster peer probe 193.142.58.203
sudo gluster peer probe 31.25.10.203
sudo gluster peer probe 104.128.188.150
```

Add an entry to /etc/fstab

### Add an entry to /etc/fstab

```
# for FS0
echo "/dev/vda2 /gluster xfs defaults 0 0"  >> /etc/fstab

# for FS1
echo "/dev/vda2 /gluster/brick1 xfs defaults 0 0"  >> /etc/fstab
echo "/dev/vdb2 /gluster/brick2 xfs defaults 0 0"  >> /etc/fstab

# for FS2
echo "/dev/vda2 /gluster/brick1 xfs defaults 0 0"  >> /etc/fstab
```

1. Create a GlusterFS volume:

```
# Distributed
gluster volume create 9xc fs0:/gluster/brick0 fs1:/gluster/d0/brick1 fs1:/gluster/d1/brick2 fs2:/gluster/brick3

# Distributed Dispersed volume:
gluster volume create 9xc disperse 4 fs0:/gluster/brick0 fs1:/gluster/d0/brick1 fs1:/gluster/d1/brick2 fs2:/gluster/brick3 force

```

For example, to create a volume named "9xc" with two nodes and a replica count of 2, run the following command:

```
sudo gluster volume create 9xc replica 2 fs1:/cots/glusterfs fs2:/cots/glusterfs

sudo gluster volume create 9xc distributed 2 fs1:/cots/glusterfs fs2:/cots/glusterfs storage.balance-xlator
```

1. Start the GlusterFS volume:

```
sudo gluster volume start {Volume Name}

```

1. Verify that the GlusterFS volume is running:

```
sudo gluster volume status
gluster volume info
```

1. Mounting the GlusterFS Volume

```
# for FS0
echo 'localhost:/9xc /mnt glusterfs defaults,_netdev,backupvolfile-server=fsnode0 0 0' >> /etc/fstab

# for FS1
echo 'localhost:/9xc /mnt glusterfs defaults,_netdev,backupvolfile-server=fsnode1 0 0' >> /etc/fstab

# for FS2
echo 'localhost:/9xc /mnt glusterfs defaults,_netdev,backupvolfile-server=fsnode2 0 0' >> /etc/fstab
```

# Limit Volume Sizes

To implement the 'limit-usage' option, you can use the 'set-volume' command with the following syntax:

```
gluster volume set <VOLNAME> limit-usage <LIMIT>

```

Replace <VOLNAME> with the name of your GlusterFS volume and <LIMIT> with the amount of storage you want to limit the peer to. For example, if you want to limit a peer to 100GB of storage, you would use:

```
gluster volume set <VOLNAME> limit-usage 100GB

```

This will limit the amount of storage used on that peer to 100GB. You can repeat this command for each peer that you want to limit.

Note that the 'limit-usage' option is not a perfect solution, as it can impact the availability and reliability of the GlusterFS volume. Therefore, it is still recommended to use peers with the same sized hard drives when possible.

## Conclusion

You have successfully installed and configured GlusterFS on Rocky Linux. You can now use it as a distributed file system to store and manage your data.

To limit a GlusterFS node to use only the maximum size of its local disk, you can use the 'limit-usage' option. Follow these steps to do so:

1. Determine the size of the local disk on the node. For example, to check the size of the '/' partition, you can run the following command:

```
sudo df -h /

```

1. Determine which brick is larger. For example, if brick 1 is larger than brick 2, you would limit the usage of brick 2 to the size of its local disk.
2. Stop the GlusterFS volume:

```
sudo gluster volume stop {Volume Name}

```

1. Set the 'limit-usage' option for the brick that needs to be limited. For example, to limit the usage of brick 2 to the size of its local disk, you would run the following command:

```
sudo gluster volume set {Volume Name} brick2 limit-usage {Size of Local Disk}

```

Replace {Volume Name} with the name of your GlusterFS volume, 'brick2' with the name of the brick that needs to be limited, and {Size of Local Disk} with the size of the local disk on the node. For example, if the local disk on the node is 100GB, you would use:

```
sudo gluster volume set 9xc limit-usage 2000GB

```

1. Start the GlusterFS volume:

```
sudo gluster volume start {Volume Name}

```

Once you have set the 'limit-usage' option, the node will only use the maximum size of its local disk for the specified brick. Note that this may impact the availability and reliability of the GlusterFS volume, so it is still recommended to use peers with the same sized hard drives when possible.

To undo the 'limit-usage' option for the 'brick2' brick in your GlusterFS volume, you can use the 'reset' option with the following syntax:

```
sudo gluster volume reset <VOLNAME> <BRICKNAME> limit-usage

```

Replace <VOLNAME> with the name of your GlusterFS volume and <BRICKNAME> with the name of the brick that you want to reset the 'limit-usage' option for. For example, if you want to reset the 'limit-usage' option for the 'brick2' brick in your '9xc' volume, you would use:

```
sudo gluster volume reset 9xc brick2 limit-usage

```

This will reset the 'limit-usage' option for the 'brick2' brick in your '9xc' volume.

[GlusterFS Modes of Operation](Install%20GlusterFS%20on%20Rocky%20Linux%20e69ac1730809428b85c15e07ec47433e/GlusterFS%20Modes%20of%20Operation%201125d5ba074d4f2184b8ffd3fc9a4dd3.md)

[Migration from Replica to Distributed modes](Install%20GlusterFS%20on%20Rocky%20Linux%20e69ac1730809428b85c15e07ec47433e/Migration%20from%20Replica%20to%20Distributed%20modes%20c4504703b2d44c4b94c64c070fb99ea2.md)

[Tiered GlusterFS Configuration](Install%20GlusterFS%20on%20Rocky%20Linux%20e69ac1730809428b85c15e07ec47433e/Tiered%20GlusterFS%20Configuration%20c5022dc0695447629d68a6d0b6a3318c.md)

[Firewall configuration for GlusterFS](Install%20GlusterFS%20on%20Rocky%20Linux%20e69ac1730809428b85c15e07ec47433e/Firewall%20configuration%20for%20GlusterFS%206d7879a270834bd29dc8883435c308c2.md)