
#1. Build Debian 12 LXC
#2. Update LXC Container & Reboot
```
# apt update -y && apt upgrade -y
# systemctl reboot
```
#3. Download AerothCore Requirements for Debian Linux
```
# ```
apt-get install screen git cmake make gcc g++ clang default-libmysqlclient-dev libssl-dev libbz2-dev libreadline-dev libncurses-dev mariadb-server libboost-all-dev -y
```
#4. Download Source code
```
# git clone https://github.com/azerothcore/azerothcore-wotlk.git --branch master --single-branch azerothcore
```
#5. Configure compile (cmake)
```
Example: 
cmake ../ -DCMAKE_INSTALL_PREFIX=$HOME/azerothcore/ -DCMAKE_C_COMPILER=/usr/bin/clang -DCMAKE_CXX_COMPILER=/usr/bin/clang++ -DWITH_WARNINGS=1 -DTOOLS_BUILD=all -DSCRIPTS=static -DMODULES=static
```
#6. Run Make
```
Determine how many cores are available:
# nproc
Should return a number "8" - depending on how many cores the LXC container was given.

# make -j 8
# make install

```
#7. Create Systemd Service files
```
# vi /etc/systemd/system/authserver.service

## Add the following:
[Unit]
Description=AzerothCore Authserver
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=azerothcore
WorkingDirectory=/root/azerothcore
ExecStart=/root/azerothcore/acore.sh run-authserver

[Install]
WantedBy=multi-user.target

# Create the worldserver.service 
# vi /etc/systemd/system/worldserver.service

## Add the following:
[Unit]
Description=AzerothCore Worldserver
After=network.target
StartLimitIntervalSec=0

[Service]
Type=simple
Restart=always
RestartSec=1
User=azerothcore
WorkingDirectory=/root/azerothcore
ExecStart=/bin/screen -S worldserver -D -m /root/azerothcore/acore.sh run-worldserver

[Install]
WantedBy=multi-user.target

```
#8. Reload Systemctl Daemon
```
# systemctl daemon-reload
```
#9. Enable Azeroth Daemons
```
# systemctl enable authserver.service
# systemctl enable worldserver.service
```
#10. Start Azeroth Daemons
```
# systemctl start authserver.service
# systemctl start worldserver.service
```
#11. Create Data folder and Download Maps
```
## Visit the following site and get link information: https://github.com/wowgaming/client-data/releases/

# cd /home/azerothcore
# mkdir data
# wget https://github.com/wowgaming/client-data/releases/download/v16/data.zip -O data.zip

## APT pull the unzip package
# apt install unzip -y

## Unzip the data.zip into the data directory 
# unzip data.zip 
```
#12. Configure MySQL/MariaDB database (Only required in LXC Container)
```
## Create the directory 'mariadb.service.d' inside /etc/systemd/system/
# mkdir -p /etc/systemd/system/mariadb.service.d/
# vi /etc/systemd/system/mariadb.service.d/lxc.conf

## Add th following to a new lxc.conf file:

[Service]
ProtectHome=false
ProtectSystem=false
#PrivateTmp=false
#PrivateNetwork=false
#PrivateDevices=false
```
#13. Create script to build Azeroth database
```
## Create create_sql.sql file
# vi create_sql.sql 

## Add the following: 
DROP USER IF EXISTS 'acore'@'localhost';
CREATE USER 'acore'@'localhost' IDENTIFIED BY 'acore' WITH MAX_QUERIES_PER_HOUR 0 MAX_CONNECTIONS_PER_HOUR 0 MAX_UPDATES_PER_HOUR 0;

GRANT ALL PRIVILEGES ON * . * TO 'acore'@'localhost' WITH GRANT OPTION;

CREATE DATABASE `acore_world` DEFAULT CHARACTER SET UTF8MB4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE `acore_characters` DEFAULT CHARACTER SET UTF8MB4 COLLATE utf8mb4_unicode_ci;

CREATE DATABASE `acore_auth` DEFAULT CHARACTER SET UTF8MB4 COLLATE utf8mb4_unicode_ci;

GRANT ALL PRIVILEGES ON `acore_world` . * TO 'acore'@'localhost' WITH GRANT OPTION;

GRANT ALL PRIVILEGES ON `acore_characters` . * TO 'acore'@'localhost' WITH GRANT OPTION;

GRANT ALL PRIVILEGES ON `acore_auth` . * TO 'acore'@'localhost' WITH GRANT OPTION;
```
#14. Build database / users for Azeroth
```
# mysql < create_sql.sql
```
#15. 