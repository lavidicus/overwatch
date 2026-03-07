# Transferring over SSH with rsync

Last edited time: May 16, 2023 11:56 PM
Owner: Jeremy Ingalls

Used the following command:

```bash
rsync -avPW -e 'ssh' --ignore-existing Plex localadmin@fs1:/cots/glusterfs/Library
```

```bash
rsync -avPW -e 'ssh -c aes128-ctr' --ignore-existing Plex localadmin@fs1:/cots/glusterfs/Library

```

This command uses rsync to transfer files over SSH from a local machine to a remote machine.

The options used are:ssh 

- `a`: archive mode, which preserves permissions, ownerships, timestamps, and other attributes of the files being transferred
- `v`: verbose mode, which outputs more information about the transfer process
- `P`: combination of `-partial` and `-progress` options, which indicates that the transfer should be resumed if interrupted and display progress information during the transfer
- `W`: whole-file transfer, which transfers the entire file instead of just the changed parts
- `e`: specifies the remote shell to use for the SSH connection, in this case it's the default shell which is `ssh`

The source directory being transferred is `Plex` on the local machine, and the destination directory is `/cots/glusterfs/Library` on the remote machine, with the username `localadmin`.

Note that `sudo` is used to run the rsync command with root privileges, which may be necessary if the user does not have the necessary permissions to read or write to certain directories on the local or remote machine.

```powershell
rsync -avPW -e 'ssh' --ignore-existing Plex localadmin@fs1:/cots/glusterfs/Library
/home/st31945/domains/ds.9xc.io/storage
```