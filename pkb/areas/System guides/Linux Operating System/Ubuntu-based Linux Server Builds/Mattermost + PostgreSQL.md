# Mattermost + PostgreSQL + Caddy

Last edited time: June 19, 2023 9:56 PM
Owner: Jeremy Ingalls

# Mattermost + PostgreSQL + Caddy

This document provides detailed installation and configuration instructions for a non-containerized Mattermost Team edition using PostGreSQL and Caddy.

## Prerequisites

Before proceeding with the installation, ensure that the following prerequisites are met:

- A server running Ubuntu 18.04 or later
- A non-root user with sudo privileges
- A domain name pointing to the server's IP address

## Install PostgreSQL

1. Update the package list:
    
    ```
    sudo apt update
    
    ```
    
2. Install PostgreSQL:
    
    ```
    sudo apt install postgresql postgresql-contrib
    
    ```
    
3. Switch to the `postgres` user:
    
    ```
    sudo -u postgres psql
    
    ```
    
4. Create a new database user and database:
    
    ```
    CREATE USER mattermost WITH ENCRYPTED PASSWORD 'password';
    CREATE DATABASE mattermost;
    GRANT ALL PRIVILEGES ON DATABASE mattermost TO mattermost;
    
    ```
    
5. Exit the PostgreSQL prompt:
    
    ```
    \q
    
    ```
    

## Install Mattermost

1. ****[Add the Mattermost Server PPA repository](https://docs.mattermost.com/install/install-ubuntu.html#on-this-page)****
    
    ```
    curl -o- https://deb.packages.mattermost.com/repo-setup.sh | sudo bash -s mattermost
    ```
    
2. Install the Mattermost Server
    
    ```
    sudo apt install mattermost -y
    
    ```
    

You now have the latest Mattermost Server version installed on your system.

The installation path is `/opt/mattermost`. The package will have added a user and group named `mattermost`. The required systemd unit file has also been created but will not be set to active.

**Note**

Since the signed package from the Mattermost repository is used for mulitple installation types, we don’t add any dependencies in the systemd unit file. If you are installing the Mattermost server on the same system as your database, you may want to add both `After=postgresql.service` and `BindsTo=postgresql.service` to the `[Unit]` section of the systemd unit file.

The location of the `mattermost.service` file on an Ubuntu server is `/lib/systemd/system/mattermost.service`.

1. Update Systemctl daemon

```bash
systemctl daemon-reload
```

# **[Setup](https://docs.mattermost.com/install/install-ubuntu.html#on-this-page)**

Before you start the Mattermost Server, you need to edit the configuration file. A sample configuration file is located at `/opt/mattermost/config/config.defaults.json`.

Rename this configuration file with correct permissions:

`sudo install -C -m 600 -o mattermost -g mattermost /opt/mattermost/config/config.defaults.json /opt/mattermost/config/config.json`

Configure the following properties in this file:

- Set `DriverName` to `"postgres"`. This is the default and recommended database for all Mattermost installations.
- Set `DataSource` to `"postgres://mmuser:<mmuser-password>@<host-name-or-IP>:5432/mattermost?sslmode=disable&connect_timeout=10"` replacing `mmuser`, `<mmuser-password>`, `<host-name-or-IP>` and `mattermost` with your database name.
- Set `"SiteURL"`: The domain name for the Mattermost application (e.g. `https://mattermost.example.com`).

After modifying the `config.json` configuration file, you can now start the Mattermost Server:

`sudo systemctl start mattermost`

Verify that Mattermost is running: curl `http://localhost:8065`. You should see the HTML that’s returned by the Mattermost Server.

The final step, depending on your requirements, is to run `sudo systemctl enable mattermost.service` so that Mattermost will start on system boot.

# **[Updates](https://docs.mattermost.com/install/install-ubuntu.html#on-this-page)**

When a new Mattermost version is released, run: `sudo apt update && sudo apt upgrade` to download and update your Mattermost instance.

**Note**

When you run the `sudo apt uprade` command, `mattermost-server` will be updated along with any other packages. We strongly recommend you stop the Mattermost Server before running the `apt` command using `sudo systemctl stop mattermost-server`.

# **[Remove Mattermost](https://docs.mattermost.com/install/install-ubuntu.html#on-this-page)**

If you wish to remove the Mattermost Server for any reason, you can run this command:

`sudo apt remove --purge mattermost`

# **[Frequently asked questions](https://docs.mattermost.com/install/install-ubuntu.html#on-this-page)**

### **Why doesn’t Mattermost start at system boot?**

To have the Mattermost Server start at system boot, the systemd until file needs to be enabled. Run the following command:

`sudo systemctl enable mattermost.service`

### **Why does Mattermost fail to start at system boot?**

If your database is on the same system as your Mattermost Server, we recommend editing the default `/lib/systemd/system/mattermost.service` systemd unit file to add `After=postgresql.service` and `BindsTo=postgresql.service` to the `[Unit]` section.

**Note**

We recommend the [Mattermost Omnibus install method](https://docs.mattermost.com/install/installing-mattermost-omnibus.html) over the `deb` signed package if you are running the Mattermost Server and database on a single system as this greatly reduces setup and ongoing maintenance.

[Next](https://docs.mattermost.com/install/install-docker.html)  [Previous](https://docs.mattermost.com/install/prepare-mattermost-database.html)

## Install Caddy

1. Download the latest Caddy release from the official website:
    
    ```
    wget <https://github.com/caddyserver/caddy/releases/download/v2.4.0/caddy_2.4.0_linux_amd64.tar.gz>
    
    ```
    
2. Extract the downloaded archive:
    
    ```
    tar -xvzf caddy_2.4.0_linux_amd64.tar.gz
    
    ```
    
3. Move the extracted binary to `/usr/local/bin`:
    
    ```
    sudo mv caddy /usr/local/bin/
    
    ```
    
4. Create a Caddyfile:
    
    ```
    sudo nano /etc/caddy/Caddyfile
    
    ```
    
5. Paste the following configuration into the file:
    
    ```
    example.com {
        reverse_proxy localhost:8065
    }
    
    ```
    
6. Replace `example.com` with your own domain name.
7. Save and close the file.
8. Create a systemd service file:
    
    ```
    sudo nano /etc/systemd/system/caddy.service
    
    ```
    
9. Paste the following configuration into the file:
    
    ```
    [Unit]
    Description=Caddy
    After=network.target
    
    [Service]
    User=root
    Group=root
    ExecStart=/usr/local/bin/caddy run --environ --config /etc/caddy/Caddyfile
    ExecReload=/usr/local/bin/caddy reload --config /etc/caddy/Caddyfile
    Restart=always
    RestartSec=10
    LimitNOFILE=1048576
    
    [Install]
    WantedBy=multi-user.target
    
    ```
    
10. Save and close the file.
11. Reload the systemd daemon:
    
    ```
    sudo systemctl daemon-reload
    
    ```
    
12. Start the Caddy service:
    
    ```
    sudo systemctl start caddy
    
    ```
    

## Configure Mattermost

1. Open a web browser and navigate to your domain name.
2. Complete the Mattermost installation wizard using the following details:
    - Database Type: `PostgreSQL`
    - Database Host: `localhost`
    - Database Name: `mattermost`
    - Database Username: `mattermost`
    - Database Password: `password`
3. Follow the remaining prompts to complete the installation.

Congratulations! You have successfully installed and configured a non-containerized Mattermost Team edition using PostGreSQL and Caddy.