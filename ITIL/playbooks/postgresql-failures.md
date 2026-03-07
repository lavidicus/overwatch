# PostgreSQL Failures

## Overview

PostgreSQL database troubleshooting for connection failures, performance issues, and recovery scenarios.

## Priority

**P2** — Database availability affects dependent services

## Category

**Incident Response**

## Status Checks

### Service Status

```bash
# Check PostgreSQL service status
sudo systemctl status postgresql

# Check if listening
sudo ss -tlnp | grep 5432

# Check processes
pg_lsclusters
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
sudo -u postgres psql -c "SELECT pg_size_pretty(pg_database_size('<database>'));

# Check active connections
sudo -u postgres psql -c "SELECT count(*) FROM pg_stat_activity;"

# Check for locked tables
sudo -u postgres psql -c "SELECT * FROM pg_locks WHERE NOT granted;"
```

## Common Failure Scenarios

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

# Check data directory permissions
ls -la /var/lib/postgresql/<version>/main/
```

**Resolution:**

```bash
# If port conflict - kill stale process
sudo pkill -9 postgres
sudo systemctl start postgresql

# If permission issue
sudo chown -R postgres:postgres /var/lib/postgresql/
```

### Connection Refused

**Symptoms:**
- Application reports "connection refused"
- Can't connect from remote host

**Diagnosis:**

```bash
# Check pg_hba.conf
sudo cat /etc/postgresql/<version>/main/pg_hba.conf

# Check listen_addresses
sudo grep listen_addresses /etc/postgresql/<version>/main/postgresql.conf
```

**Resolution:**

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

### Authentication Failed

**Symptoms:**
- "password authentication failed" errors
- Application can't authenticate

**Diagnosis:**

```bash
# Check user exists
sudo -u postgres psql -c "\du"

# Check password hash
sudo -u postgres psql -c "SELECT usename, passwd FROM pg_user WHERE usename='<user>';"
```

**Resolution:**

```bash
# Reset password
sudo -u postgres psql
ALTER USER <username> WITH PASSWORD '<newpassword>';
\q

# Or create new user
sudo -u postgres psql
CREATE USER <username> WITH PASSWORD '<password>';
GRANT ALL PRIVILEGES ON DATABASE <database> TO <username>;
\q
```

### Database Full / Disk Space

**Symptoms:**
- Writes fail
- "disk full" errors
- Performance degradation

**Diagnosis:**

```bash
# Check disk space
df -h

# Check database size
sudo -u postgres psql -c "
  SELECT 
    pg_database.datname,
    pg_size_pretty(pg_database_size(pg_database.datname)) as size
  FROM pg_database
  ORDER BY pg_database_size(pg_database.datname) DESC;"
```

**Resolution:**

```bash
# Vacuum to reclaim space
sudo -u postgres psql -c "VACUUM FULL;"

# Clear old logs
sudo rm /var/log/postgresql/*.log.*

# Add storage if needed
```

### Replication Issues

**Symptoms:**
- Standby not syncing
- Replication lag increasing

**Diagnosis:**

```bash
# Check replication status
sudo -u postgres psql -c "
  SELECT 
    client_addr,
    state,
    sent_lsn,
    write_lsn,
    sync_state
  FROM pg_stat_replication;"

# Check replication lag
sudo -u postgres psql -c "
  SELECT 
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes
  FROM pg_stat_replication;"
```

**Resolution:**

```bash
# Restart replication on standby
sudo systemctl restart postgresql

# If severely behind, may need to resync standby
```

## Recovery Procedures

### Restore from Backup

```bash
# Stop PostgreSQL
sudo systemctl stop postgresql

# Restore from backup (example with pg_dump)
sudo -u postgres pg_restore -d <database> /path/to/backup.dump

# Start PostgreSQL
sudo systemctl start postgresql
```

### Point-in-Time Recovery

```bash
# Configure recovery target in postgresql.conf
recovery_target_time = '2024-01-01 12:00:00'

# Restore base backup and WAL files
# Then start PostgreSQL
sudo systemctl start postgresql
```

## Prevention

### Monitoring

```bash
# Add to /etc/cron.daily/postgres-check
#!/bin/bash
# Check disk space
DF=$(df /var/lib/postgresql | tail -1 | awk '{print $5}' | sed 's/%//')
if [ $DF -gt 85 ]; then
  echo "PostgreSQL disk usage at ${DF}%" | mail -s "Alert: PostgreSQL Disk" admin@example.com
fi

# Check replication lag
LAG=$(sudo -u postgres psql -t -c "SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) FROM pg_stat_replication LIMIT 1;")
if [ $(echo $LAG > 100000000 | bc) -eq 1 ]; then
  echo "PostgreSQL replication lag: $LAG bytes" | mail -s "Alert: PostgreSQL Replication" admin@example.com
fi
```

### Regular Maintenance

```bash
# Daily vacuum (automatic in modern PostgreSQL)
# Weekly vacuum analyze
sudo -u postgres psql -c "VACUUM ANALYZE;"

# Monthly statistics update
sudo -u postgres psql -c "ANALYZE;"
```

## Related Playbooks

- [[docker-container-failures.md]] — If PostgreSQL runs in container
- [[proxmox-backup-restore.md]] — For VM/container backup restore

## Notes

- Default port: 5432
- Default data directory: `/var/lib/postgresql/<version>/main/`
- Default config: `/etc/postgresql/<version>/main/`
- Always backup before making changes
