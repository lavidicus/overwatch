# Creating Distributed Dispersed Volumes

Last edited time: April 26, 2023 5:08 PM
Owner: Jeremy Ingalls

# Creating Distributed Dispersed Volumes

This guide provides detailed steps for configuring and creating Distributed Dispersed Volumes for 3 nodes with different size bricks. Follow the instructions below to successfully set up the volumes.

## Prerequisites

- Three nodes with different size bricks.
- All nodes should have the GlusterFS server installed and running.
- All nodes should be reachable via their hostname or IP address.

## Steps

1. Create the Distributed Dispersed Volume by running the following command on one of the nodes:

```
sudo gluster volume create {volume_name} disperse-data 3 redundancy 1 transport tcp {node1}:{brick_dir} {node2}:{brick_dir} {node3}:{brick_dir}

```

```
sudo gluster volume create gv0 disperse 3 fsnode1.9xc.io:/cots/glusterfs fsnode2.9xc.io:/cots/glusterfs noded1.9xc.io:/cots/glusterfs force

```

- Replace `{volume_name}` with the desired name of the volume.
- Replace `{node1}`, `{node2}`, and `{node3}` with the hostnames or IP addresses of the three nodes.
- Replace `{brick_dir}` with the path to the brick directory on each node. Make sure that the directories exist and have the necessary permissions.
1. Start the volume by running the following command:

```
sudo gluster volume start {volume_name}

```

1. Verify that the volume has been created and is running by running the following command:

```
sudo gluster volume info {volume_name}

```

1. Mount the volume on a client machine by running the following command:

```
sudo mount -t glusterfs {node1}:{volume_name} {mount_point}

```

- Replace `{node1}` with the hostname or IP address of one of the nodes.
- Replace `{volume_name}` with the name of the volume.
- Replace `{mount_point}` with the path to the mount point on the client machine.
1. Verify that the volume is mounted by running the following command:

```
df -h

```

Congratulations! You have successfully configured and created a Distributed Dispersed Volume for 3 nodes with different size bricks.

The command "sudo mount -t glusterfs fs1:gv0 /mnt/gluster" failed to mount the volume. Check the log file for more details.

There could be several reasons why the mount failed. Here are some steps you can try to troubleshoot the issue:

1. Check that the GlusterFS client is installed on the machine where you're trying to mount the volume. If it's not installed, you can install it using the following command:

```
sudo apt-get install glusterfs-client

```

1. Check that the volume is running on the three nodes by running the following command on each node:

```
sudo gluster volume status

```

Make sure that the status of the volume is "Started".

1. Check the log files for any error messages related to the mount operation. The log files are typically located in the "/var/log/glusterfs" directory. You can use the following command to view the log files:

```
sudo tail -f /var/log/glusterfs/*.log

```

1. Check that the mount point directory exists and has the necessary permissions. You can use the following command to create the directory and set the permissions:

```
sudo mkdir -p /mnt/gluster
sudo chown -R $USER:$USER /mnt/gluster

```

1. Finally, try mounting the volume again using the following command:

```
sudo mount -t glusterfs {node1}:{volume_name} {mount_point}

```

Make sure to replace "{node1}" and "{volume_name}" with the appropriate values for your setup.

I hope this helps you resolve the issue. Let me know if you have any further questions or concerns.

For `{volume_name}`, you should use the name of the volume you want to create, not the path to the brick directory. An example command to create a Distributed Dispersed Volume called "my_volume" with three nodes and different size bricks would be:

```
sudo gluster volume create my_volume disperse-data 3 redundancy 1 transport tcp node1:/bricks/brick1 node2:/bricks/brick2 node3:/bricks/brick3

```

In this example, "my_volume" is the name of the volume, and "/bricks/brick1", "/bricks/brick2", and "/bricks/brick3" are the paths to the brick directories on each node.

Note that you should replace "node1", "node2", and "node3" with the hostnames or IP addresses of your nodes, and make sure that the directories exist and have the necessary permissions.

The error message "LOOKUP() / => -1 (Transport endpoint is not connected)" indicates that the GlusterFS client is not able to connect to the GlusterFS server. Here are some steps you can try to fix the issue:

1. Check that the GlusterFS server is running on the nodes. You can use the following command to check the status of the GlusterFS volumes:

```
sudo gluster volume status

```

If the volumes are not running, you can start them using the following command:

```
sudo gluster volume start {volume_name}

```

1. Check that the GlusterFS client is installed on the client machine. You can install it using the following command:

```
sudo apt-get install glusterfs-client

```

1. Check that the hostname or IP address of the GlusterFS server is correct. You can use the following command to check the hostname:

```
hostname

```

Make sure that the hostname matches the hostname or IP address used in the mount command.

1. Check the log files for any error messages related to the mount operation. The log files are typically located in the "/var/log/glusterfs" directory. You can use the following command to view the log files:

```
sudo tail -f /var/log/glusterfs/*.log

```

1. Finally, try unmounting and remounting the volume using the following commands:

```
sudo umount {mount_point}
sudo mount -t glusterfs {node1}:{volume_name} {mount_point}

```

Make sure to replace "{node1}" and "{volume_name}" with the appropriate values for your setup, and "{mount_point}" with the mount point directory.

I hope this helps you resolve the issue. Let me know if you have any further questions or concerns.