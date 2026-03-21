# Migration from Replica to Distributed modes

Last edited time: April 26, 2023 12:24 AM
Owner: Jeremy Ingalls

Migrating an existing GlusterFS cluster configured as a replica cluster to a distributed cluster with storage.balance-xlator and customizing data distribution based on your requirements can be achieved through the following steps:

1. Stop the existing GlusterFS volume:

```
# gluster volume stop <volume_name>

```

1. Detach the replica bricks from the volume:

```

# gluster volume remove-brick <volume_name> replica 1 <node1>:<brick_path1> <node2>:<brick_path2> force

```

1. Create a new distributed volume with the bricks detached in step 2:

To convert a GlusterFS replica volume to a distributed volume, you will need to remove the replica bricks from the volume and add new bricks that are distributed across the servers. However, when you remove the replica bricks, you will lose the data that was stored on them. Therefore, it is important to make sure that you have a backup of the data before you make this change.

To switch from a replicated to distributed GlusterFS cluster, follow these steps:

1. Remove the replica bricks from the GlusterFS volume using the `gluster volume remove-brick` command:

```
gluster volume remove-brick <volume-name> replica <num-of-bricks> <server>:<brick-path> [<server>:<brick-path> ...]

```

Replace `<volume-name>` with the name of the GlusterFS volume, `<num-of-bricks>` with the number of bricks to remove, and `<server>:<brick-path>` with the server and directory path for each brick.

For example, to remove two replica bricks from a volume named `myvolume` on servers `server1` and `server2`:

```
gluster volume remove-brick myvolume replica 2 server1:/bricks/brick1 server2:/bricks/brick2

sudo gluster volume create 9xc replica 2 fs1:/cots/glusterfs fs2:/cots/glusterfs
```

1. Add new bricks to the GlusterFS volume that are distributed across the servers using the `gluster volume add-brick` command:

```
gluster volume add-brick <volume-name> distribute <num-of-bricks> <server>:<brick-path> [<server>:<brick-path> ...]

```

Replace `<volume-name>` with the name of the GlusterFS volume, `<num-of-bricks>` with the number of bricks to add, and `<server>:<brick-path>` with the server and directory path for each brick.

For example, to add two new bricks to a volume named `myvolume` on servers `server1` and `server2`:

```
gluster volume add-brick myvolume distribute 2 server1:/bricks/brick1 server2:/bricks/brick2

```

1. Start the volume to make it available for use:

```
gluster volume start <volume-name>

```

Replace `<volume-name>` with the name of the GlusterFS volume.

For example, to start a volume named `myvolume`:

```
gluster volume start myvolume

```

Keep in mind that when you remove the replica bricks, you will lose the data that was stored on them. Therefore, it is important to make sure that you have a backup of the data before you make this change.

```
# gluster volume create <new_volume_name> <node1>:<brick_path1> <node2>:<brick_path2> force

```

1. Start the new distributed volume:

```

# gluster volume start <new_volume_name>

```

1. Enable the storage.balance-xlator to balance the files evenly across the nodes:

```

# gluster volume set <new_volume_name> cluster.balance-xlator on

```

1. Configure the 60GB node as a hot tier to accept files and move them to the first two nodes for distribution:

First, add the 60GB brick as a hot tier brick:

```
# gluster volume tier <new_volume_name> attach <node_fast>:<brick_fast_path>

```

Then, set the tier mode to cache:

```
 
# gluster volume set <new_volume_name> tier.mode cache

```

1. Configure rebalance for the new distributed volume:

```
 
# gluster volume rebalance <new_volume_name> start

```

1. Monitor the rebalance process:

```

# gluster volume rebalance <new_volume_name> status

```

1. Update your clients to mount the new distributed volume:

```
# mount -t glusterfs <node_ip>:/<new_volume_name> /mnt/<mount_point>

```

Please note that this process might result in data loss, so it's crucial to have a backup of your data before performing these actions. Additionally, you should tailor the commands according to your specific configuration and node IPs/brick paths.