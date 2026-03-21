# Rsync

Last edited time: May 17, 2023 2:30 PM
Owner: Jeremy Ingalls

# Install Rsync on Linux

Rsync is a popular and efficient tool used for syncing and transferring files between different computers or servers. In this guide, we will provide step-by-step instructions for installing rsync on both Ubuntu and Redhat-based Linux systems.

## Installing Rsync on Ubuntu:

1. Open the terminal on your Ubuntu system by pressing `Ctrl+Alt+T` or searching for "Terminal" in the applications menu.
2. Update the package list by running the following command:

```
sudo apt update

```

1. Once the package list is updated, install rsync by running the following command:

```
sudo apt install rsync

```

1. After the installation is complete, verify that rsync is installed properly by running the following command:

```
rsync --version

```

1. If the installation was successful, you should see the rsync version information displayed in the terminal.
2. (Optional) If you have a firewall configured on your Ubuntu system, you will need to allow traffic on port 873, which is the port used by rsync. To do this, run the following command:

```
sudo ufw allow 873/tcp

```

## Installing Rsync on Redhat-based Linux:

1. Open the terminal on your Redhat-based Linux system by pressing `Ctrl+Alt+T` or searching for "Terminal" in the applications menu.
2. Update the package list by running the following command:

```
sudo yum update

```

1. Once the package list is updated, install rsync by running the following command:

```
sudo yum install rsync

```

1. After the installation is complete, verify that rsync is installed properly by running the following command:

```
rsync --version

```

1. If the installation was successful, you should see the rsync version information displayed in the terminal.
2. (Optional) If you have a firewall configured on your Redhat-based Linux system, you will need to allow traffic on port 873, which is the port used by rsync. To do this, run the following command:

```
sudo firewall-cmd --zone=9xc --add-port=873/tcp --permanent
sudo firewall-cmd --reload

```

Congratulations! You have successfully installed rsync on your Ubuntu or Redhat-based Linux system. You can now use this powerful tool for syncing and transferring files between different computers or servers.

[Transferring over SSH with rsync](Rsync%20263cd431a7b7472bbda1cf8176abcf65/Transferring%20over%20SSH%20with%20rsync%20f3b4621616224f008f5566f94c6ac647.md)