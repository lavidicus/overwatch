# ITIL Playbook: Tool Call Timeouts

---
**Author:** Sam (ops butler AI)  
**Created:** 2026-03-21  
**Last Updated:** 2026-03-21  
**Version:** 1.0  
**Tags:** [tool-call, timeout, gateway, session, troubleshooting]  
---

## Overview

Diagnoses and resolves tool call timeouts where commands fail with "Gateway closed" or "missing tool result" errors. Covers gateway restarts, session reconnection, and queue clearing.

## Priority

**P2 (High)** — Affects agent responsiveness and task completion

- **P1** — All tool calls failing
- **P2** — Intermittent timeouts, degraded performance
- **P3** — Occasional single command timeouts

## Category

**Incident Response** — Requires diagnostic steps and potential recovery actions

## Estimated Duration

- **Total:** ~5-10 minutes
- **Critical path:** ~3 minutes (diagnose + restart)
- **Notes:** Complex issues may require deeper investigation

## Communication

- **Before starting:** No notification needed for routine restarts
- **After completion:** Report status if downtime >5 minutes
- **If blocked >10 min:** Escalate to system admin

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Temporary message loss | Low | Queue persists to disk |
| Session interruption | Low | Auto-reconnect on restart |
| Context overflow | Medium | Monitor before restarting |

## Prerequisites

- OpenClaw installed and running
- Access to gateway host
- `openclaw` CLI available

## Status Checks

### Check Gateway Health

```bash
# Service status
openclaw gateway status

# Check if listening
ss -tlnp | grep 18789

# Check process
ps aux | grep openclaw-gateway
```

### Check Session Status

```bash
# Session health
openclaw status

# Check context usage
openclaw status | grep Context

# Check queue depth
openclaw status | grep Queue
```

### Check Logs

```bash
# Recent gateway logs
tail -100 ~/.openclaw/openclaw-2026-*.log

# Search for errors
grep -i "timeout\|closed\|error" ~/.openclaw/openclaw-2026-*.log | tail -50
```

## Procedure

### Step 1: Diagnose Issue Type

```bash
# Check gateway is running
openclaw gateway status

# Check session status
openclaw status
```

**Decision Tree:**

**If gateway not running →** Go to Step 2A  
**If gateway running but tool calls fail →** Go to Step 2B  
**If queue depth >0 →** Go to Step 2C  
**If context >90% →** Go to Step 2D

### Step 2A: Gateway Not Running

```bash
# Start gateway
openclaw gateway start

# Verify
openclaw gateway status
```

### Step 2B: Gateway Running But Tool Calls Failing

```bash
# Full restart (most reliable)
openclaw gateway stop && sleep 2 && openclaw gateway start

# Wait for recovery
sleep 5

# Verify
openclaw status
```

**Why full restart:** `openclaw gateway restart` can fail silently. Full stop+sleep+start is more reliable.

### Step 2C: Queue Depth >0

```bash
# Check queue
openclaw status | grep Queue

# If queue has items, process them
openclaw queue process

# If stuck, clear old items
openclaw queue clear --older-than 1h
```

### Step 2D: Context >90%

```bash
# Check context
openclaw status | grep Context

# If approaching 90%, write to memory
python3 /home/localadmin/.openclaw/workspace/scripts/context_monitor.py <context_size>

# Full restart clears context
openclaw gateway stop && sleep 2 && openclaw gateway start
```

## Verification

### Immediate Verification

```bash
# 1. Gateway running
openclaw gateway status

# 2. Session healthy
openclaw status

# 3. Context within limits
openclaw status | grep Context

# 4. Queue clear
openclaw status | grep Queue
```

### Test Tool Call

Run a simple command to verify:

```bash
# Test exec tool
openclaw exec "echo 'Tool call working'"
```

**Expected:** Command completes successfully within normal timeout (30s).

## Common Issues

### Issue: Gateway Closed Errors

**Symptoms:**
- Tool calls fail with "Gateway closed (1000)"
- "Gateway target: ws://127.0.0.1:18789"

**Diagnosis:**
```bash
# Check if gateway process exists
ps aux | grep openclaw-gateway

# Check if port is listening
ss -tlnp | grep 18789

# Check logs
journalctl -u openclaw-gateway -n 50
```

**Resolution:**
```bash
# Full restart
openclaw gateway stop && sleep 2 && openclaw gateway start
```

### Issue: Missing Tool Result

**Symptoms:**
- "missing tool result in session history"
- "inserted synthetic error result"

**Diagnosis:**
```bash
# Check session status
openclaw status

# Check queue
openclaw status | grep Queue
```

**Resolution:**
1. Check queue depth
2. Clear old queue items if needed
3. Restart gateway if queue stuck

### Issue: Session Not Reconnecting

**Symptoms:**
- Gateway running but sessions disconnected
- Messages not being processed

**Diagnosis:**
```bash
# Check matrix connection
grep matrix ~/.openclaw/openclaw.json

# Check recent logs
tail -200 ~/.openclaw/openclaw-2026-*.log | grep -i "matrix\|disconnect"
```

**Resolution:**
```bash
# Full restart forces reconnection
openclaw gateway stop && sleep 2 && openclaw gateway start
```

## Rollback

```bash
# Stop gateway
openclaw gateway stop

# Restore config
cp ~/.openclaw/openclaw.json.backup.YYYYMMDD-HHMMSS ~/.openclaw/openclaw.json

# Restart
openclaw gateway start
```

## Prevention

### Regular Monitoring

```bash
# Check daily
openclaw status | grep -E "Context|Queue"

# Alert at 80%: write to memory
# Alert at 90%: write to memory + notify
# Alert at 95%: auto-compact
```

### Best Practices

1. **Use `write` instead of `edit`** — More reliable, avoids silent failures
2. **Full restart > `restart` command** — More reliable for clearing state
3. **Monitor context growth** — Write to memory proactively at 90%
4. **Keep queue small** — Process old items regularly

## Related Playbooks

- [[openclaw-gateway-failures.md]] — Gateway service failures
- [[context-window-optimization.md]] — Context management
- [[docker-container-failures.md]] — If running in container

## Related Documentation

- **MEMORY.md:** Context overflow crisis (2026-03-04)
- **MEMORY.md:** Gateway restart P2 fixed (2026-03-03)
- **PKB:** Tool call timeout patterns

---
**Issue ID:** ITIL-ISSUE-TOOL-CALL-TIMEOUT  
**Created:** 2026-03-21  
**Status:** Active
