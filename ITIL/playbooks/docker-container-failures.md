# Docker Container Service Failures

## Overview

Playbook for diagnosing and recovering Docker container services including Plex, Mattermost, PostgreSQL, Minecraft Server, and OwnCloud.

---

## 1) Identify Failed Container

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

### Check Container Logs

```bash
# Last 100 lines
docker logs --tail 100 <container_name>

# Follow logs in real-time
docker logs -f <container_name>

# With timestamps
docker logs --timestamps <container_name>
```

---

## 2) Common Failure Scenarios

### Scenario A: Container Won't Start

```bash
# Check for port conflicts
docker ps -a --filter "publish=32400"  # Plex
docker ps -a --filter "publish=5432"   # PostgreSQL
docker ps -a --filter "publish=8065"   # Mattermost

# Check resource limits
docker inspect <container_name> | grep -A5 HostConfig

# Verify volume mounts
docker inspect <container_name> | grep -A10 Mounts
```

### Scenario B: Container Crashes Immediately

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

### Scenario C: Container Running But Unresponsive

```bash
# Check if process is running inside container
docker exec <container_name> ps aux

# Check network connectivity
docker exec <container_name> curl -I http://localhost:8080

# Check resource usage
docker stats --no-stream <container_name>
```

---

## 3) Service-Specific Recovery

### Plex Media Server

```bash
# Restart Plex
docker restart plex

# Verify Plex is running
curl -I http://localhost:32400/status

# Access Plex configuration
docker exec -it plex bash
# Inside container:
cd /config
ls -la

# Check Plex logs inside container
tail -f /config/Library/Application\ Support/Plex\ Media\ Server/Logs/Plex\ Media\ Server.log
```

### Mattermost

```bash
# Restart Mattermost
docker restart mattermost

# Verify Mattermost is running
curl -I http://localhost:8065/api/v4/system/ping

# Access Mattermost config
docker exec -it mattermost cat /mattermost/config.json

# Check Mattermost logs
docker logs mattermost | grep -i error
```

### PostgreSQL

```bash
# Restart PostgreSQL
docker restart postgres

# Verify PostgreSQL is running
docker exec postgres pg_isready

# Connect to database
docker exec -it postgres psql -U postgres

# Check PostgreSQL logs
docker exec postgres tail -f /var/log/postgresql/postgresql-*.log

# Check database size
docker exec postgres psql -c "SELECT pg_size_pretty(pg_database_size('dbname'))"
```

### Minecraft Server

```bash
# Restart Minecraft
docker restart minecraft

# Check server status
curl -s http://localhost:25565/status  # If query plugin installed

# Access server console
docker exec -it minecraft tail -f logs/latest.log

# Send RCON commands (if configured)
echo "say Server restarted" | nc localhost 25575
```

### OwnCloud

```bash
# Restart OwnCloud
docker restart owncloud

# Verify OwnCloud is running
curl -I http://localhost:8080/remote.php/status

# Check OwnCloud config
docker exec -it owncloud php occ status

# Run OwnCloud maintenance
docker exec -it owncloud php occ maintenance:mode --off
```

---

## 4) Container Resource Management

### Check Resource Usage

```bash
# Real-time resource monitoring
docker stats

# Single snapshot
docker stats --no-stream

# Check specific container
docker stats --no-stream <container_name>
```

### Adjust Resource Limits

```bash
# Stop container
docker stop <container_name>

# Update container with new limits
docker update \
  --memory=4g \
  --memory-swap=4g \
  --cpus=2.0 \
  <container_name>

# Restart container
docker start <container_name>
```

### View Current Limits

```bash
# Inspect container resource limits
docker inspect <container_name> | grep -A10 HostConfig
```

---

## 5) Container Migration

### Backup Container

```bash
# Export container filesystem
docker export <container_name> > /backup/container_backup.tar

# Save container configuration
docker inspect <container_name> > /backup/container_config.json

# Backup volumes
docker run --rm \
  -v <volume_name>:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/volume_backup.tar.gz /data
```

### Restore Container

```bash
# Import container
docker import /backup/container_backup.tar <new_container_name>

# Recreate from configuration
# (Better approach: use docker-compose or save stack)
docker stack deploy -c docker-stack.yml mystack
```

---

## 6) VGPU Container Issues

### Check NVIDIA Driver Status

```bash
# Verify NVIDIA driver
docker run --rm nvidia/cuda:11.0-base nvidia-smi

# Check VGPU availability
docker run --rm --gpus all nvidia/cuda:11.0-base nvidia-smi

# List available GPU devices
mdevctl list

# Check VGPU type assignments
mdevctl list-types
```

### Restart VGPU Service

```bash
# On Proxmox host
systemctl restart nvidia-mofed

# Verify VGPU devices
mdevctl list
```

---

## 7) Prevention & Monitoring

### Create Health Checks

```bash
# Add health check to running container
docker update \
  --health-cmd="curl -f http://localhost:8080/health || exit 1" \
  --health-interval=30s \
  --health-timeout=10s \
  --health-retries=3 \
  <container_name>

# Check health status
docker inspect --format='{{.State.Health.Status}}' <container_name>
```

### Automated Restart Policy

```bash
# Set restart policy
docker update --restart=always <container_name>

# Options:
# --restart=no          Never restart
# --restart=on-failure  Restart on exit code != 0
# --restart=always      Always restart
# --restart=unless-stopped Restart unless manually stopped
```

---

## Related PKB Guides

- [[pkb/areas/System guides/Linux Operating System/Docker Containers/Docker container management.md]]
- [[pkb/areas/System guides/Linux Operating System/Docker Containers/Container Resource Allocations.md]]
- [[pkb/areas/System guides/Linux Operating System/Docker Containers/Migrate Containers.md]]
- [[pkb/resources/Concepts/Docker Containers]]

---

*Created: 2026-03-07 | Priority: P2 | Category: Incident*
