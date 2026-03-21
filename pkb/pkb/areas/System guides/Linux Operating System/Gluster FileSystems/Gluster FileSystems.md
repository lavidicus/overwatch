# Gluster FileSystems

Last edited time: May 17, 2023 2:31 PM
Owner: Jeremy Ingalls

# GlusterFS

GlusterFS is a scalable, distributed file system that can run on commodity hardware. It allows you to create a single, large virtual file system out of multiple physical file systems, which can then be used to store and manage large amounts of data.

## Installation

To install GlusterFS on a Redhat or Ubuntu based Linux system, you can use the following commands:

### Redhat/CentOS

```
sudo yum install -y centos-release-gluster
sudo yum install -y glusterfs-server
sudo systemctl start glusterd
sudo systemctl enable glusterd

```

### Ubuntu/Debian

```
sudo add-apt-repository ppa:gluster/glusterfs-7
sudo apt-get update
sudo apt-get install -y glusterfs-server
sudo systemctl start glusterd
sudo systemctl enable glusterd

```

## Configuration

Once GlusterFS is installed, you can configure it by creating a trusted storage pool, which is a collection of GlusterFS servers that can communicate with each other.

### Creating a trusted storage pool

To create a trusted storage pool, you need to perform the following steps:

1. Identify the IP addresses of the GlusterFS servers that will be part of the pool.
2. On one of the servers, run the following command:

```
sudo gluster peer probe {IP address of the other server}

```

1. Repeat step 2 on all the servers that will be part of the pool.

### Creating a GlusterFS volume

Once you have created a trusted storage pool, you can create a GlusterFS volume, which is a logical container that can hold files and directories.

To create a GlusterFS volume, you need to perform the following steps:

1. On one of the servers, create a directory that will be used as the mount point for the volume:

```
sudo mkdir /data/glusterfs

```

1. Create the volume using the following command:

```
sudo gluster volume create {volume name} replica {number of replicas} transport tcp {server 1}:{path to directory} {server 2}:{path to directory}

```

For example, to create a volume called "myvolume" with two replicas on servers with IP addresses 192.168.1.10 and 192.168.1.11, you would run the following command:

```
sudo gluster volume create myvolume replica 2 transport tcp 192.168.1.10:/data/glusterfs 192.168.1.11:/data/glusterfs

```

1. Start the volume using the following command:

```
sudo gluster volume start {volume name}

```

1. Mount the volume on your client machines using the following command:

```
sudo mount -t glusterfs {server 1}:{volume name} {mount point}

```

For example, to mount the "myvolume" volume on a client machine with IP address 192.168.1.12, you would run the following command:

```
sudo mount -t glusterfs 192.168.1.10:myvolume /mnt/glusterfs

```

## Conclusion

In conclusion, GlusterFS is a powerful and flexible distributed file system that can be used to store and manage large amounts of data on commodity hardware. By following the installation and configuration steps outlined in this document, you should be able to set up a GlusterFS cluster on your Redhat or Ubuntu based Linux system.

[Install GlusterFS on Rocky Linux](Gluster%20FileSystems%20f54dd2b04f1a47adab0958ec7a387438/Install%20GlusterFS%20on%20Rocky%20Linux%20e69ac1730809428b85c15e07ec47433e.md)

[**Creating Distributed Dispersed Volumes**](Gluster%20FileSystems%20f54dd2b04f1a47adab0958ec7a387438/Creating%20Distributed%20Dispersed%20Volumes%2013cbd9c068bd44929a0be3c09f18d9ab.md)