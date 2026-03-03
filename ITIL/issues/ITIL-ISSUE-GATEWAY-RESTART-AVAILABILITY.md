# ITIL-ISSUE-GATEWAY-RESTART-AVAILABILITY

**Issue ID:** ITIL-ISSUE-GATEWAY-RESTART-AVAILABILITY  
**Created:** 2026-03-03 15:10 UTC  
**Priority:** P2 (High)  
**Category:** Incident  
**Status:** New

## Summary

OpenClaw gateway restarts cause the assistant to become unavailable after reboot, requiring manual intervention to restore functionality.

## Problem Description

**Symptom:** When OpenClaw gateway is restarted (via `systemctl --user restart openclaw-gateway`), the assistant becomes unavailable and cannot respond to messages until manual intervention.

**Impact:** 
- Loss of assistant availability
- Requires manual restart/intervention to restore
- Disrupts automated workflows and heartbeat monitoring

## Root Cause Analysis

### Investigation Findings:

1. **Edit Race Condition:** When making file edits (e.g., `models.json`, `auth-profiles.json`), the `edit` tool sometimes fails silently or the changes don't take effect immediately.

2. **Gateway Restart Timing:** After `systemctl --user restart openclaw-gateway`, the gateway service restarts but the agent session may not reconnect properly.

3. **Tool Call Failures:** Logs show "missing tool result in session history; inserted synthetic error result for transcript repair" errors during gateway restart.

4. **Configuration Caching:** OpenClaw may cache configuration files and not pick up changes until a full service restart, which doesn't always happen automatically.

## Timeline

- **15:07 UTC:** Gateway restarted after vLLM cleanup
- **15:10 UTC:** User reported unavailability
- **15:10 UTC:** Verified gateway running (PID 101319), RPC probe OK
- **15:10 UTC:** vLLM warnings confirmed eliminated
- **Issue:** Agent session may not have reconnected properly to signal channel

## Reproduction Steps

1. Make configuration changes to `~/.openclaw/agents/main/agent/` files
2. Run `systemctl --user restart openclaw-gateway`
3. Wait for gateway to restart (typically 3-5 seconds)
4. Check agent availability via `session_status` or message channel
5. Observe if agent is responsive

## Current Workaround

Manually verify gateway status after restart:
```bash
openclaw gateway status
systemctl --user status openclaw-gateway
```

If unresponsive, try:
```bash
systemctl --user restart openclaw-gateway
```

## Resolution Plan

### Short-term (Immediate)

1. **Add startup verification:** After gateway restart, automatically verify agent availability
2. **Improve error handling:** Better error messages when agent fails to reconnect
3. **Session recovery:** Implement automatic session reconnection logic

### Medium-term

1. **Configuration change detection:** Auto-restart gateway when config files change
2. **Health check endpoint:** Add `openclaw status` that checks both gateway and agent
3. **Heartbeat improvement:** Ensure heartbeats can detect and recover from gateway restarts

### Long-term

1. **Service orchestration:** Use systemd to ensure gateway and agent restart together
2. **Persistent session management:** Implement session persistence across restarts
3. **Graceful shutdown:** Better handling of clean vs. unclean restarts

## Related Issues

- vLLM provider cleanup (resolved)
- Context window rollover fix (implemented)
- Signal group policy configuration (pending)

## Next Steps

1. Document this issue in long-term memory
2. Implement automatic post-restart verification
3. Add monitoring for agent availability
4. Create runbook for gateway restart procedures

---

**Owner:** @Sam  
**Last Updated:** 2026-03-03 15:10 UTC  
**Tags:** gateway, restart, availability, incident, p2