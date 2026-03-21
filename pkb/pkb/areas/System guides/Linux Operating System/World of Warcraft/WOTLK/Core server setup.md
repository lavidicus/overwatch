### 1. Create Virtual Machines on Proxmox VE

**For Both VMs:**

- **Create VM:**
- Navigate to the Proxmox web interface.
   - Click on "Create VM."
   - Assign a unique VM ID and name (e.g., `wow-game-server`, `wow-db-server`).
   - Select the Ubuntu Server ISO as the installation media.
 
 - **Configure VM Settings:**
     - **CPU:** Allocate at least 8 cores.
    - **Memory:** Allocate at least 8 GB RAM.
    - **Disk:** Allocate at least 120 GB of storage.
     - **Network:** Ensure both VMs are on the same virtual network for internal communication.

- **Install Ubuntu Server:**

    - Boot each VM using the Ubuntu Server ISO.  
	- Follow the installation prompts to set up Ubuntu Server on each VM.


### 2. Set Up the Database Server (Server 2)

**Install MySQL Server:**

```bash
sudo apt update -y
sudo apt install mysql-server -y
```


**Secure MySQL Installation:**

```bash
sudo mysql_secure_installation
```

 
Follow the prompts to set a root password and secure your installation.

**Configure MySQL for Remote Access:**

Edit the MySQL configuration file:
```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Find the line:
```ini
bind-address = 127.0.0.1
```

Change it to:
```ini
bind-address = 0.0.0.0
```

Restart MySQL:
```bash
sudo systemctl restart mysql
```

**Create a Database User for the Game Server:**
```bash
sudo mysql -u root -p
```

In the MySQL prompt:
```sql
CREATE USER 'acore'@'%' IDENTIFIED BY 'yourpassword'; GRANT ALL PRIVILEGES ON *.* TO 'acore'@'%'; FLUSH PRIVILEGES;
```

Allow acore user to access remotely (subnet)
```bash
CREATE USER 'acore'@'10.50.15.%' IDENTIFIED BY 'yourpassword';
GRANT ALL PRIVILEGES ON *.* TO 'acore'@'10.50.15.%';
FLUSH PRIVILEGES;  EXIT;
```

Replace `'yourpassword'` with a strong password.

### 3. Set Up the Game Server (wow)

**Install Dependencies:**

```bash
sudo apt update 
sudo apt install git cmake make gcc g++ libmysqlclient-dev libssl-dev libbz2-dev libreadline-dev libncurses-dev libboost-all-dev p7zip-full clang
```

Create azeroth user:
```bash
sudo adduser wow
```

**Create Build Directory

```bash
sudo mkdir /cots
sudo mkdir -p /cots/wotlk
sudo chown -R wow:wow /cots
```

Change current user to azeroth
```bash
sudo su - wow
cd /cots/azerothcore-wotlk
```

**Clone AzerothCore Repository:**

```bash
git clone https://github.com/azerothcore/azerothcore-wotlk.git
```


```bash
export AC_CODE_DIR=/cots/azerothcore-wotlk
mkdir build && cd build 
cmake ../ -DCMAKE_INSTALL_PREFIX=$AC_CODE_DIR/env/dist/ \
  -DCMAKE_C_COMPILER=/usr/bin/gcc \
  -DCMAKE_CXX_COMPILER=/usr/bin/g++ \
  -DWITH_WARNINGS=1 -DTOOLS_BUILD=all -DSCRIPTS=static -DMODULES=static
make -j $(nproc)
make install
```

Install the mysql-client package as localadmin:
```bash
sudo apt install mysql-client-core-8.0 mysql-client
```
**Set Up Configuration Files:**

```bash
cd /home/wow/azerothcore-wotlk/env/dist/etc
cp worldserver.conf.dist worldserver.conf 
cp authserver.conf.dist authserver.conf`
```

**Edit Configuration Files:**

- Open `worldserver.conf` and `authserver.conf`:
```bash
vi worldserver.conf 
vi authserver.conf
```

- Locate the `LoginDatabaseInfo`, `WorldDatabaseInfo`, and `CharacterDatabaseInfo` settings.

- Update them to point to the database server's IP address:
  
```ini
LoginDatabaseInfo = "192.168.1.100;3306;acore;yourpassword;acore_auth" WorldDatabaseInfo = "192.168.1.100;3306;acore;yourpassword;acore_world" CharacterDatabaseInfo = "192.168.1.100;3306;acore;yourpassword;acore_characters"
```

Replace `192.168.1.100` with your database server's IP address.

* - Locate the `DataDir and LogsDir` settings.

```
DataDir = "/home/wow/azerothcore/data"

LogsDir = "/home/wow/azerothcore/env/dist/logs"
```


**Extract Map and DBC Files:**

- Copy your WoW 3.3.5a client to the server.
* Copy tools from azerothcore-wotlk folder to Wow Client directory
```bash
cd /home/wow/wow-client/
cp /cots/azerothcore/env/dist/bin/map_extractor .
cp /cots/azerothcore/env/dist/bin/mmaps_generator .
cp /cots/azerothcore/env/dist/bin/vmap4_* .
```

* Extract and Build the maps from the Wow Client
```bash
./map_extractor

mkdir vmaps;
./vmap4_assembler Buildings vmaps

mkdir mmaps
./mmaps_generator
```

   
- Place the extracted `maps`, `vmaps`, `mmaps`, and `dbc` directories in the appropriate location (e.g., `/home/azeroth-server/data`).
    
```bash
cd /home/wow/wow-client/

cp -r maps /home/wow/azerothcore/data/
cp -r vmaps /home/wow/azerothcore/data/
cp -r dbc /home/wow/azerothcore/data/
```


* Build Azeroth-Core databases
```bash
mysql -h 10.50.15.123 -u acore -p

CREATE DATABASE acore_auth DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE acore_characters DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE DATABASE acore_world DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

* Run Auth Server service to initialize database tables
```bash
cd /home/wow/azerothcore/env/dist/bin
./authserver
```

* run WorldServer service to complete database initialization. (in a new ssh tab)
```bash
cd /home/wow/azerothcore/env/dist/bin
./worldserver
```

* Create GM account from WorldServer service
```bash
account create user password
account set gmlevel user 2 -1

```