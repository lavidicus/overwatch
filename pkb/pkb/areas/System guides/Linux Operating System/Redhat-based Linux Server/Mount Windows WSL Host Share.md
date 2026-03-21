# Mount Windows WSL Host Share

Last edited time: May 10, 2023 2:35 PM
Owner: Jeremy Ingalls

# Mount Windows WSL Host Share

This guide will walk you through the process of mounting a Windows Subsystem for Linux (WSL) host shared folder inside a Debian host, along with instructions for installing Samba.

## Requirements

- A Windows machine with WSL enabled
- Debian host installed on WSL
- Basic knowledge of the command line interface

## Installation and Configuration of Samba

1. Open the Debian host and update the system using the following command:

```
sudo apt-get update && sudo apt-get upgrade

```

1. Install Samba by running:

```
sudo apt-get install samba

```

1. Once the installation is complete, create a directory to share on the Windows host by running:

```
mkdir /mnt/share

```

1. Restart the Samba service using the following command:

```
sudo service smbd restart

```

## Mounting the Shared Folder

1. Create a directory in Debian to mount the shared folder:

```
mkdir /mnt/windows

```

1. Mount the shared folder using the following command:

```
sudo mount -t drvfs '\\\\\\\\WindowsHostName\\\\shared' /mnt/windows

```

Note: Replace `WindowsHostName` with the name of your Windows machine and `shared` with the name of the shared folder.

1. You can now access the shared folder by navigating to `/mnt/windows` directory.

## Examples

```powershell
sudo mount -t drvfs 'F:' /mnt/f
```

## Conclusion

In this tutorial, we have successfully installed and configured Samba and mounted a Windows host shared folder inside a Debian host. You can now easily share files between your Windows machine and Debian host.