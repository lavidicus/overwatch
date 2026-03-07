# Rclone synchronous transfers

Last edited time: May 18, 2023 9:40 AM
Owner: Jeremy Ingalls

# Rclone synchronous transfers

Rclone is a command-line program used to manage files on cloud storage providers and local filesystems. Rclone is written in Go and supports many cloud storage providers such as Google Drive, Amazon S3, Dropbox, and OneDrive. In this document, we will provide instructions on how to install and configure rclone to run as a service.

## Installation instructions

1. Visit the [rclone download page](https://rclone.org/downloads/) and download the appropriate binary for your operating system. For example, if you are running Ubuntu, you can download the binary by running the following command:
    
    ```
    curl <https://rclone.org/install.sh> | sudo bash
    
    ```
    
2. Once the binary is downloaded, you can verify the installation by running the following command:
    
    ```
    rclone version
    
    ```
    
    This command should display the version of rclone that you just installed.
    

## Configuration instructions

1. Run the following command to start the rclone configuration wizard:
    
    ```
    rclone config
    
    ```
    
2. Follow the prompts to configure rclone for your cloud storage provider. You will need to provide your provider-specific credentials such as API keys, client IDs, and client secrets.
3. Once the configuration is complete, you can verify that rclone is working correctly by running the following command:
    
    ```
    rclone ls remote:
    
    ```
    
    Replace `remote` with the name you gave your cloud storage provider during the configuration wizard. This command should display a list of files and directories in your cloud storage provider.
    

## Running rclone as a service

You can run rclone as a service on your operating system using the following instructions:

### Systemd service

1. Create a new file in the `/etc/systemd/system/` directory called `rclone.service`:
    
    ```
    sudo nano /etc/systemd/system/rclone.service
    
    ```
    
2. Paste the following content into the file:
    
    ```
    [Unit]
    Description=Rclone Service
    After=network-online.target
    
    [Service]
    User=YOUR_USERNAME
    ExecStart=/usr/bin/rclone serve http remote: --addr :8080 --vfs-cache-mode writes
    Restart=on-failure
    RestartSec=5
    
    [Install]
    WantedBy=multi-user.target
    
    ```
    
3. Replace `YOUR_USERNAME` with your username on the system.
4. Save and close the file by pressing `Ctrl+X`, then `Y`, then `Enter`.
5. Reload the systemd daemon to pick up the new service:
    
    ```
    sudo systemctl daemon-reload
    
    ```
    
6. Enable the service to start at boot:
    
    ```
    sudo systemctl enable rclone.service
    
    ```
    
7. Start the service:
    
    ```
    sudo systemctl start rclone.service
    
    ```
    

### Upstart service

1. Create a new file in the `/etc/init/` directory called `rclone.conf`:
    
    ```
    sudo nano /etc/init/rclone.conf
    
    ```
    
2. Paste the following content into the file:
    
    ```
    description "Rclone Service"
    
    start on runlevel [2345]
    stop on runlevel [06]
    
    setuid YOUR_USERNAME
    
    exec /usr/bin/rclone serve http remote: --addr :8080 --vfs-cache-mode writes
    
    respawn
    respawn limit 10 5
    
    ```
    
3. Replace `YOUR_USERNAME` with your username on the system.
4. Save and close the file by pressing `Ctrl+X`, then `Y`, then `Enter`.
5. Start the service:
    
    ```
    sudo service rclone start
    
    ```
    

You have now successfully installed and configured rclone to run as a service on your system. You can test your setup by uploading and downloading files with rclone.

To allow rclone to skip existing files and send 10 files at a time, add the following flags to the rclone command:

```
--transfers 10 --ignore-existing

```

This will limit the number of files transferred at once to 10 and will skip any files that already exist in the destination. You can adjust the number of transfers and other options as necessary.

To specify a directory called `storage` on the remote server that needs to be pulled to the local server running rclone, you can use the following command:

```
rclone sync remote:storage /path/to/local/storage

```

Replace `remote` with the name you gave your cloud storage provider during the configuration wizard, and replace `/path/to/local/storage` with the path to the local storage directory on your server. This command will synchronize the `storage` directory on the remote server with the corresponding directory on the local server.

You can also use the `copy` command to copy files from the remote server to the local server:

```
rclone copy remote:storage /path/to/local/storage

```

This command will copy the `storage` directory on the remote server to the corresponding directory on the local server.

### Rclone Syntax

Here are some common `rclone` commands and syntax:

- `rclone ls remote:`: List contents of a remote directory
- `rclone copy source:path dest:path`: Copy files from source to destination
- `rclone sync source:path dest:path`: Synchronize files from source to destination
- `rclone move source:path dest:path`: Move files from source to destination
- `rclone delete remote:path`: Delete files from a remote directory
- `rclone rmdir remote:path`: Remove an empty remote directory
- `rclone mkdir remote:path`: Create a new remote directory
- `rclone mount remote:path /mnt/remote`: Mount a remote directory to a local directory
- `rclone serve http remote:`: Serve files over HTTP
- `rclone serve webdav remote:`: Serve files over WebDAV
- `rclone version`: Display the version of rclone that is installed
- `rclone help`: Display help documentation for rclone

For a full list of commands and syntax, please refer to the [rclone documentation](https://rclone.org/docs/).

### Examples

```powershell
rclone --transfers 10 --ignore-existing ds:/domains/ds.9xc.io/storage /export
```

To provide verbose output and show progress, use the `--progress` and `--verbose` flags with any `rclone` command. For example:

```
rclone sync remote:storage /path/to/local/storage --progress --verbose

```

This command will synchronize the `storage` directory on the remote server with the corresponding directory on the local server, while displaying verbose output and progress information.

[Rclone Examples](Rclone%20synchronous%20transfers%2055122be098e14aa6b4809750fe451aff/Rclone%20Examples%20b5b4aa6d2eaa4d0d8b15e498a71e0464.md)