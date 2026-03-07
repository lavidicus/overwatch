# OpenClaw Gateway Failures

---
**Author:** Sam
**Created:** 2026-03-07
**Last Updated:** 2026-03-07
**Version:** 2.0
**Tags:** [openclaw, gateway, ai, messaging]
---

## Overview

Playbook for diagnosing and recovering OpenClaw gateway service failures. Covers service crashes, message queue issues, and connectivity problems.

## Priority

**P1** — Critical for AI assistant availability

## Category

**Incident Response**

## Estimated Duration

- **Total:** ~5-15 minutes
- **Critical path:** ~3 minutes (restart + verify)
- **Notes:** Complex issues may require deeper investigation

## Communication

- **Before starting:** No notification needed for routine restarts
- **After completion:** Update status if downtime >5 minutes
- **If blocked >10 min:** Escalate to system admin

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Message loss during restart | Low | Queue persists to disk |
| Session interruption | Low | Sessions auto-reconnect |
| High memory usage | Medium | Monitor and adjust limits |

## Prerequisites

- **Access:** Root or sudo on gateway host
- **Tools:** systemctl, curl, openclaw CLI
- **Configuration:** openclaw.json location

## Status Checks

### Check Gateway Status

```bash
# Service status
systemctl status openclaw-gateway

# Check if listening
ss -tlnp | grep 18789

# Check process
ps aux | grep openclaw

# Gateway health
openclaw status
```

### Check Logs

```bash
# Recent logs
journalctl -u openclaw-gateway -n 100 --no-pager

# All logs
journalctl -u openclaw-gateway --no-pager

# Follow in real-time
journalctl -u openclaw-gateway -f
```

## Procedure

### Step 1: Identify Issue Type

```bash
# Check service state
systemctl is-active openclaw-gateway

# Check gateway health
openclaw status

# Check for errors
journalctl -u openclaw-gateway --no-pager | grep -i error
```

**Decision Points:**

**If service down →** Go to Step 2A
**If unhealthy but running →** Go to Step 2B
**If high memory →** Go to Step 2C

### Step 2A: Service Not Running

```bash
# Attempt start
sudo systemctl start openclaw-gateway

# Check for errors immediately
sudo systemctl status openclaw-gateway
journalctl -u openclaw-gateway -n 50 --no-pager

# Verify listening
ss -tlnp | grep 18789
```

### Step 2B: Service Running But Unhealthy

```bash
# Check gateway status
openclaw status

# Check queue depth
openclaw queue list

# Restart gateway
sudo systemctl restart openclaw-gateway

# Verify recovery
sleep 5
openclaw status
```

### Step 2C: High Memory Usage

```bash
# Check memory
openclaw status | grep -i memory

# Clear session cache
openclaw session clear --inactive

# Restart if needed
sudo systemctl restart openclaw-gateway
```

## Verification

```bash
# Service running
systemctl is-active openclaw-gateway

# Health check
curl -s http://localhost:18789/health

# Gateway status
openclaw status

# Test message
openclaw message test "Gateway is operational"
```

## Common Issues

### Gateway Won't Start

**Symptoms:**
- Service fails to start
- Port already in use

**Resolution:**

```bash
# Check for conflicts
sudo lsof -i :18789

# Kill conflicting process
sudo kill -9 <PID>

# Start gateway
sudo systemctl start openclaw-gateway
```

### Message Queue Full

**Symptoms:**
- Messages not being processed
- Queue depth increasing

**Resolution:**

```bash
# Check queue
openclaw queue list

# Process pending messages
openclaw queue process

# Clear old messages if needed
openclaw queue clear --older-than 1h
```

## Rollback

```bash
# Stop gateway
sudo systemctl stop openclaw-gateway

# Restore config
sudo cp ~/.openclaw/openclaw.json.backup ~/.openclaw/openclaw.json

# Restart
sudo systemctl start openclaw-gateway
```

## Related Playbooks

- [[docker-container-failures.md]] — If gateway runs in container
- [[llama-server-failures.md]] — If using llama-server backend

## Notes

- Default port: 18789
- Messages persist to disk
- Auto-reconnect on network issues

---
**Version History:**
- v1.0 — Original playbook
- v2.0 — Updated to new ITIL template format (2026-03-07)
