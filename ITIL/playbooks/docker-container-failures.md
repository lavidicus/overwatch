# Docker Container Service Failures

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [docker, containers, incident-response, plex, mattermost, postgresql, minecraft, owncloud]
---

## Overview

Playbook for diagnosing and recovering Docker container services including Plex, Mattermost, PostgreSQL, Minecraft Server, and OwnCloud. Use when any container service is unavailable or degraded.

## Priority

**P2** — Service availability affects user experience but not critical infrastructure

## Category

**Incident Response**

## Estimated Duration

- **Total:** ~15-30 minutes
- **Critical path:** ~5-10 minutes (restart + verification)
- **Notes:** Complex issues may require deeper investigation

## Communication

- **Before starting:** No notification needed for routine restarts
- **After completion:** Update status if service was down >5 minutes
- **If blocked >15 min:** Investigate underlying system issues

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Data loss during container crash | Medium | Ensure volumes are properly mounted |
| Service interruption during recovery | Low | Restart typically takes seconds |
| Port conflicts | Low | Check port availability first |

## Prerequisites

- **Access:** Root or sudo on Docker host
- **Tools:** Docker CLI installed
- **Information:** Container names, expected ports
- **Dependencies:** Docker daemon running

## Status Checks

### List All Containers

```bash
# All containers (running and stopped)
docker ps -a

# Filter by name
docker ps -a --filter "name=plex"
docker ps -a --filter "name=postgres"
docker ps -a --filter "name=mattermost"
docker ps -a --filter "name=minecraft"
docker ps -a --filter "name=owncloud"

# Show exit codes
docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
```

**Expected output:**
```
NAMES         STATUS                    PORTS
plex          Up 5 hours               0.0.0.0:32400->32400/tcp
postgres      Up 5 hours               0.0.0.0:5432->5432/tcp
```

### Check Container Logs

```bash
# Last 100 lines
docker logs --tail 100 <container_name>

# Follow logs in real-time
docker logs -f <container_name>

# With timestamps
docker logs --timestamps <container_name>
```

## Procedure

### Step 1: Identify Failed Container

Run status checks to determine which container is affected:

```bash
# Quick health check for all containers
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -v "Up" || echo "All containers running"
```

**Decision Points:**

**If container exited →** Go to Step 2A
**If container running but unresponsive →** Go to Step 2B
**If container restarting loop →** Go to Step 2C

### Step 2A: Container Won't Start

```bash
# Check for port conflicts
docker ps -a --filter "publish=32400"  # Plex
docker ps -a --filter "publish=5432"   # PostgreSQL
docker ps -a --filter "publish=8065"   # Mattermost

# Check resource limits
docker inspect <container_name> | grep -A5 HostConfig

# Verify volume mounts
docker inspect <container_name> | grep -A10 Mounts

# Check exit code
docker inspect <container_name> --format '{{.State.ExitCode}}'
```

**Resolution:**

```bash
# Kill conflicting processes
sudo lsof -i :<port> | tail -1 | awk '{print $2}' | xargs kill -9

# Restart container
docker start <container_name>
```

### Step 2B: Container Crashes Immediately

```bash
# Check for configuration errors
docker logs <container_name> | grep -i error
docker logs <container_name> | grep -i fatal

# Test configuration files
# For PostgreSQL:
docker exec <container_name> pg_config

# For Mattermost:
cat /path/to/mattermost/config.json
```

### Step 2C: Container Running But Unresponsive

```bash
# Check if process is running inside container
docker exec <container_name> ps aux

# Check network connectivity
docker exec <container_name> curl -I http://localhost:8080

# Check resource usage
docker stats --no-stream <container_name>

# Force restart
docker restart <container_name>
```

### Step 3: Service-Specific Recovery

#### Plex Media Server

```bash
# Restart Plex
docker restart plex

# Verify Plex is running
curl -I http://localhost:32400/status

# Check Plex logs inside container
docker exec -it plex tail -f /config/Library/Application\ Support/Plex\ Media\ Server/Logs/Plex\ Media\ Server.log
```

#### Mattermost

```bash
# Restart Mattermost
docker restart mattermost

# Verify Mattermost is running
curl -I http://localhost:8065/api/v4/system/ping

# Check Mattermost logs
docker logs mattermost | grep -i error
```

#### PostgreSQL

```bash
# Restart PostgreSQL
docker restart postgres

# Verify PostgreSQL is running
docker exec postgres pg_isready

# Check database size
docker exec postgres psql -c "SELECT pg_size_pretty(pg_database_size('dbname'))"
```

#### Minecraft Server

```bash
# Restart Minecraft
docker restart minecraft

# Check server status
curl -s http://localhost:25565/status  # If query plugin installed

# Access server console
docker exec -it minecraft tail -f logs/latest.log
```

#### OwnCloud

```bash
# Restart OwnCloud
docker restart owncloud

# Verify OwnCloud is running
curl -I http://localhost:8080/remote.php/status

# Run OwnCloud maintenance
docker exec -it owncloud php occ status
```

### Step 4: Resource Management

```bash
# Real-time resource monitoring
docker stats

# Single snapshot
docker stats --no-stream

# Check specific container
docker stats --no-stream <container_name>
```

**If resources exhausted:**

```bash
# Update container with new limits
docker update \
  --memory=4g \
  --memory-swap=4g \
  --cpus=2.0 \
  <container_name>

# Restart container
docker restart <container_name>
```

## Verification

```bash
# All containers running
docker ps --filter "status=running" --format "table {{.Names}}"

# No exited containers
docker ps --filter "status=exited" --format "{{.Names}}" | wc -l

# Health check endpoints
# Plex
curl -s -o /dev/null -w "%{http_code}" http://localhost:32400/status

# Mattermost
curl -s -o /dev/null -w "%{http_code}" http://localhost:8065/api/v4/system/ping

# PostgreSQL
docker exec postgres pg_isready -q
```

**Expected output:**
```
HTTP/1.1 200 OK (Plex)
HTTP/1.1 200 OK (Mattermost)
docker exec postgres pg_isready -q (exits 0)
```

## Common Issues

### Port Conflict

**Symptoms:**
- Container exits immediately with error
- "Address already in use" in logs

**Diagnosis:**

```bash
# Check what's using the port
sudo lsof -i :<port>

# Or
sudo ss -tlnp | grep <port>
```

**Resolution:**

```bash
# Kill conflicting process
sudo kill -9 <PID>

# Restart container
docker start <container_name>
```

### Out of Memory

**Symptoms:**
- Container killed with exit code 137
- System OOM messages in logs

**Diagnosis:**

```bash
# Check system logs
dmesg | grep -i "out of memory"

# Check container memory usage
docker stats --no-stream <container_name>
```

**Resolution:**

```bash
# Increase memory limit
docker update --memory=4g <container_name>

# Or free up system memory
sync; echo 3 | sudo tee /proc/sys/vm/drop_caches
```

### Volume Mount Failed

**Symptoms:**
- Container won't start
- Permission denied errors

**Diagnosis:**

```bash
# Check volume mounts
docker inspect <container_name> | grep -A10 Mounts
```

**Resolution:**

```bash
# Fix permissions on host directory
sudo chown -R 1000:1000 /path/to/host/volume
```

## Rollback

```bash
# Stop problematic container
docker stop <container_name>

# Remove container
docker rm <container_name>

# Re-create from image
docker run -d \
  --name <container_name> \
  --restart always \
  -p <host_port>:<container_port> \
  -v <host_volume>:<container_volume> \
  <image_name>

# Or restore from backup
docker load < /backup/container_backup.tar
docker import /backup/container_backup.tar <container_name>
```

## Related Playbooks

- [[openclaw-gateway-failures.md]] — If OpenClaw runs in container
- [[postgresql-failures.md]] — Database-specific issues
- [[proxmox-vm-lxc-migration.md]] — If migration needed

## Notes

- Default restart policy: `--restart=always`
- Health checks recommended for production containers
- Monitor disk usage regularly
- Backup container data periodically

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
