# Tiered GlusterFS Configuration

Last edited time: April 26, 2023 2:03 AM
Owner: Jeremy Ingalls

# Tiered GlusterFS Configuration

To set up a 2-tiered Gluster volume for backend storage with 3 nodes, follow these steps:

1. Ensure that all nodes have GlusterFS installed and configured correctly.
2. Create a trusted storage pool between the 3 nodes by running the following command on all nodes:

```
sudo gluster peer probe [IP address or hostname of the other two nodes]

```

1. Create two separate Gluster volumes on the first and second nodes using the following commands:

```
sudo gluster volume create vol1 [IP address or hostname of the first node]:/data/brick1/gv1
sudo gluster volume create vol2 [IP address or hostname of the second node]:/data/brick1/gv2

sudo gluster volume create fs1 transport tcp fs1:/cots/glusterfs force
sudo gluster volume create fs2 transport tcp fs2:/cots/glusterfs force
sudo gluster volume create nd1 nd1:/cots/glusterfs force

# example: 
sudo gluster volume create fs1 fs1:/cots/glusterfs force
sudo gluster volume create fs2 fs2:/cots/glusterfs force
sudo gluster volume create fs3 fs3:/cots/glusterfs force
```

1. Start the volumes using the following commands:

```
sudo gluster volume start vol1
sudo gluster volume start vol2

# example:
sudo gluster volume start fs1
sudo gluster volume start fs2
sudo gluster volume start nd1
```

1. Create a distributed-replicate volume across the two volumes using the following command on the third node:

```
sudo gluster volume create vol3 disperse 2 transport tcp [IP address or hostname of the first node]:/vol1 [IP address or hostname of the second node]:/vol2 force

sudo gluster volume create fs3 disperse 2 replica 2 tier type=data storage=local path=/cots/glusterfs tier-group=1 transport tcp fs1:/cots/glusterfs fs2:/cots/glusterfs force

sudo gluster volume create vol3 replica 2 transport tcp [IP address or hostname of Node 1]:/vol1 [IP address or hostname of Node 2]:/vol2 force

Actual:

# sudo gluster volume create fs3 replica 2 transport tcp fs1:/cots/glusterfs fs2:/cots/glusterfs force
```

Note: The "disperse 2" option ensures that the data is distributed across both volumes and can tolerate the failure of one node. The "force" option is used to bypass any warnings or errors that may be encountered.
6. Start the volume using the following command:

```
sudo gluster volume start vol3

```

1. Mount the volume on the client machine using the following command:

```
sudo mount -t glusterfs [IP address or hostname of the third node]:/vol3 /mnt/glusterfs

```

With these steps, you should now have a 2-tiered Gluster volume for backend storage with 3 nodes. The first node has 3tb of storage and the second node has 2tb of storage, while the 3rd node receives files and distributes file storage across the first and second nodes.

Note: The "disperse count must be greater than 2" error occurs when the number of bricks specified in the volume create command is not enough to meet the disperse count specified. Please ensure that the number of bricks specified is sufficient for the disperse count you are trying to achieve.