# Llama Server Failures

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [llama-server, ollama, ai, inference, context-window]
---

## Overview

Playbook for diagnosing and recovering llama-server instances. Covers context window overflow, service crashes, and configuration issues.

## Priority

**P2** — AI services important but not critical infrastructure

## Category

**Incident Response**

## Estimated Duration

- **Total:** ~10-20 minutes
- **Critical path:** ~5 minutes (restart + verify)
- **Notes:** Context overflow may require additional cleanup

## Communication

- **Before starting:** No notification needed
- **After completion:** Log incident if downtime >10 minutes
- **If blocked:** Check system resources first

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Service interruption | Low | Quick restart usually sufficient |
| Context loss | Low | Temporary state only |
| High memory usage | Medium | Monitor and adjust limits |

## Prerequisites

- **Access:** Root or sudo on server
- **Tools:** systemctl, curl, docker (if containerized)
- **Configuration:** llama-server config file location

## Status Checks

### Check Service Status

```bash
# Systemd service
systemctl status llama-server

# Check if listening
ss -tlnp | grep 11434

# Check process
ps aux | grep llama-server
```

### Check Logs

```bash
# Recent logs
journalctl -u llama-server -n 100 --no-pager

# All logs
journalctl -u llama-server --no-pager

# Follow in real-time
journalctl -u llama-server -f
```

## Procedure

### Step 1: Identify Issue Type

```bash
# Check service state
systemctl is-active llama-server

# Check for context overflow errors
journalctl -u llama-server --no-pager | grep -i "context\|overflow\|token"

# Check memory usage
df -h
free -h
```

**Decision Points:**

**If service down →** Go to Step 2A
**If context overflow →** Go to Step 2B
**If high memory →** Go to Step 2C

### Step 2A: Service Not Running

```bash
# Attempt start
sudo systemctl start llama-server

# Check for errors immediately
sudo systemctl status llama-server
journalctl -u llama-server -n 50 --no-pager

# Verify listening
ss -tlnp | grep 11434
```

### Step 2B: Context Window Overflow

```bash
# Check current context size
llama-server --help | grep ctx-size

# Stop service
sudo systemctl stop llama-server

# Clear any cached data
rm -rf /tmp/llama-*

# Restart with increased context (if needed)
sudo systemctl start llama-server
```

### Step 2C: High Memory Usage

```bash
# Check memory limits
cat /sys/fs/cgroup/memory/llama-server/memory.limit_in_bytes 2>/dev/null || echo "No limit set"

# Adjust if needed
sudo systemctl edit llama-server
# Add: [Service]
# MemoryMax=8G

# Restart
sudo systemctl restart llama-server
```

## Verification

```bash
# Service running
systemctl is-active llama-server

# Health check
curl -s http://localhost:11434/api/version

# Test inference
echo "test" | curl -s -X POST http://localhost:11434/api/generate -d @-
```

## Common Issues

### Context Overflow

**Symptoms:**
- "context window full" errors
- Service crashes under load

**Resolution:**

```bash
# Increase context size in config
# Edit /etc/llama-server/config.json
{
  "ctx_size": 131072
}

# Restart
sudo systemctl restart llama-server
```

### Out of Memory

**Symptoms:**
- Service killed with exit code 137
- System OOM messages

**Resolution:**

```bash
# Reduce context size or batch size
# Edit config
{
  "ctx_size": 65536,
  "batch_size": 512
}

# Restart
sudo systemctl restart llama-server
```

## Rollback

```bash
# Stop service
sudo systemctl stop llama-server

# Restore config
sudo cp /etc/llama-server/config.json.backup /etc/llama-server/config.json

# Restart
sudo systemctl start llama-server
```

## Related Playbooks

- [[openclaw-gateway-failures.md]] — If OpenClaw uses llama-server
- [[token-optimization.md]] — Context management

## Notes

- Default port: 11434
- Context size: 65536 (default), can increase to 131072
- Monitor memory usage under heavy load

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
