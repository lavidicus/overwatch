# PostgreSQL Failures

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [database, postgresql, incident-response, recovery]
---

## Overview

PostgreSQL database troubleshooting for connection failures, performance issues, and recovery scenarios. Use this playbook when database services are unavailable or degraded.

## Priority

**P2** — Database availability affects dependent services and user operations

## Category

**Incident Response**

## Estimated Duration

- **Total:** ~30-60 minutes (varies by issue type)
- **Critical path:** ~15 minutes (status checks + common resolutions)
- **Notes:** Recovery from backup can take hours depending on database size

## Communication

- **Before starting:** Notify #ops-channel of investigation
- **After completion:** Update incident ticket with resolution
- **If blocked >15 min:** Escalate to database administrator

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Service interruption during repair | High | Schedule maintenance window if possible |
| Data loss during recovery | Critical | Verify backup integrity before proceeding |
| Configuration errors | Medium | Document all changes, test in staging first |

## Prerequisites

- **Access:** Root or sudo privileges on database server
- **Tools:** PostgreSQL client installed, `journalctl` available
- **Information:** Database version, server hostname, backup location
- **Dependencies:** Backup system operational, monitoring alerts configured

## Status Checks

### Service Status

```bash
# Check PostgreSQL service status
sudo systemctl status postgresql

# Check if listening on port 5432
sudo ss -tlnp | grep 5432

# Check cluster status
pg_lsclusters
```

**Expected output:**
```
 Version  Active  Port    Owner
 16      online  5432    postgres
```

### Connection Test

```bash
# Test local connection
sudo -u postgres psql -c "SELECT version();"

# Test from application host
psql -h <host> -U <user> -d <database>
```

### Database Health

```bash
# Check database size
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('<database>'));"

# Check active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check for locked tables
sudo -u postgres psql -c "SELECT * FROM pg_locks WHERE NOT granted;"
```

## Procedure

### Step 1: Identify the Failure Type

Run status checks to determine the category of failure:

```bash
# Quick diagnostic script
sudo systemctl is-active postgresql && echo "SERVICE: Running" || echo "SERVICE: Stopped"
sudo ss -tlnp | grep -q 5432 && echo "PORT: Listening" || echo "PORT: Not Listening"
sudo -u postgres psql -c "SELECT 1;" >/dev/null 2>&1 && echo "CONNECTION: OK" || echo "CONNECTION: Failed"
```

**Expected output:**
```
SERVICE: Running
PORT: Listening
CONNECTION: OK
```

### Step 2: Diagnose Based on Symptoms

**If SERVICE is Stopped:**

```bash
# Check logs for startup errors
sudo journalctl -u postgresql -n 50 --no-pager

# Check for port conflicts
sudo ss -tlnp | grep 5432

# Check data directory permissions
ls -la /var/lib/postgresql/<version>/main/
```

**If CONNECTION Failed but SERVICE Running:**

```bash
# Check pg_hba.conf settings
sudo cat /etc/postgresql/<version>/main/pg_hba.conf | grep -v "^#" | grep -v "^$"

# Check listen_addresses
sudo grep "listen_addresses" /etc/postgresql/<version>/main/postgresql.conf
```

### Step 3: Apply Resolution

**Decision Points:**

**If port conflict →** Go to Resolution 3A
**If permission issue →** Go to Resolution 3B
**If connection refused →** Go to Resolution 3C
**If authentication failed →** Go to Resolution 3D

#### Resolution 3A: Port Conflict

```bash
# Kill stale PostgreSQL processes
sudo pkill -9 postgres

# Restart service
sudo systemctl start postgresql

# Verify
sudo systemctl status postgresql
```

#### Resolution 3B: Permission Issue

```bash
# Fix ownership
sudo chown -R postgres:postgres /var/lib/postgresql/

# Restart service
sudo systemctl start postgresql
```

#### Resolution 3C: Connection Refused

```bash
# Edit pg_hba.conf to allow connections
# Add line for remote access:
host    all             all             0.0.0.0/0               md5

# Edit postgresql.conf
sudo nano /etc/postgresql/<version>/main/postgresql.conf
# Change:
listen_addresses = '*'  # or specific IPs

# Reload configuration
sudo systemctl reload postgresql
```

#### Resolution 3D: Authentication Failed

```bash
# Reset password
sudo -u postgres psql
ALTER USER <username> WITH PASSWORD '<newpassword>';
\q
```

### Step 4: Recovery (If Database Corrupted)

**If database is corrupted or data loss occurred:**

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Backup current state (if possible)
tar czf /tmp/pg-backup-$(date +%Y%m%d).tar.gz /var/lib/postgresql/<version>/main/

# Restore from backup
sudo -u postgres pg_restore -d <database> /path/to/backup.dump

# Start PostgreSQL
sudo systemctl start postgresql
```

## Verification

```bash
# Service is running
sudo systemctl is-active postgresql

# Port is listening
sudo ss -tlnp | grep 5432

# Can connect and query
sudo -u postgres psql -c "SELECT version();"

# Check for errors in logs
sudo journalctl -u postgresql -n 20 | grep -i error

# Verify database size matches expected
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('<database>'));"
```

## Common Issues

### Database Won't Start

**Symptoms:**
- Service fails to start
- Error in logs about port already in use
- Permission denied on data directory

**Diagnosis:**

```bash
# Check logs
sudo journalctl -u postgresql -n 50

# Check if port is in use
sudo ss -tlnp | grep 5432
```

**Resolution:**

```bash
# If port conflict
sudo pkill -9 postgres
sudo systemctl start postgresql
```

### Disk Full

**Symptoms:**
- Writes fail
- "disk full" errors
- Performance degradation

**Diagnosis:**

```bash
# Check disk space
df -h

# Check largest tables
sudo -u postgres psql -c "
  SELECT 
    schemaname, tablename, 
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
  FROM pg_tables 
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10;"
```

**Resolution:**

```bash
# Vacuum to reclaim space
sudo -u postgres psql -c "VACUUM FULL;"

# Clear old logs
sudo find /var/log/postgresql/ -name "*.log.*" -mtime +7 -delete
```

### Replication Issues

**Symptoms:**
- Standby not syncing
- Replication lag increasing

**Diagnosis:**

```bash
sudo -u postgres psql -c "
  SELECT 
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    sync_state
  FROM pg_stat_replication;"
```

**Resolution:**

```bash
# Restart replication on standby
sudo systemctl restart postgresql
```

## Rollback

```bash
# If configuration change caused issues, restore from backup config
cp /etc/postgresql/<version>/main/postgresql.conf.bak \
   /etc/postgresql/<version>/main/postgresql.conf
cp /etc/postgresql/<version>/main/pg_hba.conf.bak \
   /etc/postgresql/<version>/main/pg_hba.conf

# Reload PostgreSQL
sudo systemctl reload postgresql

# Or restore entire database from backup
sudo systemctl stop postgresql
# Restore data directory from backup
sudo systemctl start postgresql
```

## Related Playbooks

- [[docker-container-failures.md]] — If PostgreSQL runs in container
- [[proxmox-backup-restore.md]] — For VM/container backup restore
- [[postgresql-failures.md]] — This playbook (original version)

## Notes

- **Default port:** 5432
- **Default data directory:** `/var/lib/postgresql/<version>/main/`
- **Default config:** `/etc/postgresql/<version>/main/`
- **Backup strategy:** Always backup before making changes
- **Maintenance window:** Schedule major operations during low-traffic periods

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
