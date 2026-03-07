# PostgreSQL Installation on Debian/Ubuntu

## Overview

Install, configure, and manage PostgreSQL database server on Debian or Ubuntu 22.04 systems using official repository packages.

## When to Use

- Setting up new PostgreSQL server
- Installing database for applications
- Development environment setup
- Learning PostgreSQL administration

## Prerequisites

- Debian or Ubuntu 22.04 (or compatible)
- Terminal/command line access
- Root or sudo privileges
- Internet connectivity for package installation

## Quick Summary

```bash
apt update && apt install -y postgresql postgresql-contrib && systemctl status postgresql
```

## Detailed Procedure

### Step 1: Update Package Lists

```bash
apt update

# Optional: Upgrade existing packages
apt upgrade -y
```

### Step 2: Install PostgreSQL

```bash
apt install postgresql postgresql-contrib -y
```

**Packages installed:**

| Package | Description |
|---------|-------------|
| `postgresql` | Core server + `psql` CLI |
| `postgresql-contrib` | Extensions (pgcrypto, hstore, etc.) |

### Step 3: Verify Installation

**Check service status:**

```bash
systemctl status postgresql
```

**Expected output:**

```
● postgresql.service - PostgreSQL RDBMS
     Loaded: loaded (...; enabled; ...)
     Active: active (exited) since ...
● postgresql@<version>-main.service
     Active: active (running) since ...
```

**Start manually if needed:**

```bash
systemctl start postgresql
```

### Step 4: Access PostgreSQL (Peer Auth)

**Switch to postgres user:**

```bash
sudo -i -u postgres
```

**Enter psql:**

```bash
psql
```

**Verify connection:**

```sql
\conninfo
```

**Expected:** `You are connected to database "postgres" as user "postgres" via socket...`

**Exit:**

```sql
\q
exit  # Return to regular user
```

### Step 5: Set Password for postgres User

```bash
# As postgres user
sudo -i -u postgres
psql
```

**Set password:**

```sql
\password postgres
```

Enter and confirm new password.

### Step 6: Create Database User and Database

**Connect as postgres:**

```bash
sudo -i -u postgres
psql
```

**Create role (user):**

```sql
CREATE ROLE myuser WITH LOGIN PASSWORD 'strongpassword';
```

**Create database:**

```sql
CREATE DATABASE mydatabase OWNER myuser;
```

**Grant privileges:**

```sql
GRANT ALL PRIVILEGES ON DATABASE mydatabase TO myuser;
```

**Exit:**

```sql
\q
exit
```

### Step 7: Connect as New User

```bash
psql -U myuser -d mydatabase -h localhost
```

Enter password when prompted.

### Step 8: Service Management

```bash
# Check status
systemctl status postgresql

# Start/Stop/Restart
systemctl start postgresql
systemctl stop postgresql
systemctl restart postgresql

# Enable/disable on boot
systemctl enable postgresql
systemctl disable postgresql
```

### Step 9: Enable Remote Connections (Optional)

**Find config files:**

```bash
sudo -u postgres psql -c 'SHOW config_file;'
sudo -u postgres psql -c 'SHOW hba_file;'
```

**Edit postgresql.conf:**

```bash
sudo nano /etc/postgresql/<version>/main/postgresql.conf
```

Change:

```ini
listen_addresses = '*'  # Or specific IP
```

**Edit pg_hba.conf:**

```bash
sudo nano /etc/postgresql/<version>/main/pg_hba.conf
```

Add:

```bash
# IPv4
host    all    all    192.168.1.0/24    scram-sha-256

# IPv6
host    all    all    ::/0              scram-sha-256
```

**Restart and configure firewall:**

```bash
systemctl restart postgresql
ufw allow 5432/tcp
ufw reload
```

## Verification

```bash
# Service running
systemctl is-active postgresql

# Port listening
netstat -tlnp | grep 5432

# Local connection works
sudo -u postgres psql -c "SELECT version();"

# Remote connection (if configured)
psql -h <server-ip> -U myuser -d mydatabase
```

## Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Permission denied" | Running as wrong user | Use `sudo -u postgres` |
| "Connection refused" | Service not running | `systemctl start postgresql` |
| "Authentication failed" | Wrong password | Reset with `\password` |
| "No pg_hba.conf entry" | Remote not allowed | Edit `pg_hba.conf` |
| Port 5432 blocked | Firewall | `ufw allow 5432/tcp` |

## Notes

- Default port: 52
- Data directory: `/var/lib/postgresql/<version>/main`
- Config: `/etc/postgresql/<version>/main/`
- Logs: `/var/log/postgresql/`
- Use `scram-sha-256` for better security than `md5`
- Never use `0.0.0.0/0` in production without strong auth

## Related

- [[ITIL/playbooks/postgresql-failures.md]]
- [[pkb/areas/System guides/Proxmox/PVE Guides/PVE System Tools/System-V Tools]]

---
**Last Updated:** 2026-03-07
