# DC WSL Provider SSRF Blocker

**Date:** 2026-05-29
**Host:** dc (ssh localadmin@dc)
**Provider:** wsl (WSL llamacpp.gguf on RTX 4000 Ada, 12GB)

## Problem

OpenClaw on dc was throwing `⚠️ Something went wrong while processing your request` for all WSL provider requests. Switching from `llamacpp.gguf` to LFM2.5 made the issue visible but was not the cause.

## Root Cause

OpenClaw's SSRF (Server-Side Request Forgery) protection blocks HTTP requests to private/internal IP addresses. The `wsl` provider's baseUrl is `http://wsl:11434/v1`, which resolves to `192.168.1.91` — a private RFC1918 address.

OpenClaw gateway logs confirmed:
```
[security] blocked URL fetch (url-fetch) targetOrigin=http://wsl:11434 reason=Blocked: resolves to private/internal/special-use IP address
```

CLI `curl` to `http://wsl:11434` worked fine — only OpenClaw's runtime enforced the block.

## Fix

Added `"request": { "allowPrivateNetwork": true }` to the `wsl` provider config in `~/.openclaw/openclaw.json`:

```json
{
  "providers": {
    "wsl": {
      "baseUrl": "http://wsl:11434/v1",
      "request": { "allowPrivateNetwork": true },
      ...
    }
  }
}
```

Then restarted the gateway: `systemctl --user restart openclaw-gateway`

## Key Takeaway

When running OpenClaw on a host that connects to inference servers on private/internal IPs (WSL, VMs, Docker containers, etc.), the provider config **must** include `"request": { "allowPrivateNetwork": true }` or all LLM requests will be silently blocked.

This applies to:
- Any provider using `http://` URLs resolving to `10.x.x.x`, `172.16-31.x.x`, or `192.168.x.x`
- WSL host addresses (often `192.168.x.x`)
- Docker container addresses
- Internal Proxmox VM addresses (node1, node2, etc.)

Check `journalctl --user -u openclaw-gateway --since "5 min ago"` for `SSRFBlockedError` or `Blocked: resolves to private/internal/special-use IP address` to diagnose.

## Related

- node1/node2 providers already have `allowPrivateNetwork: true` (they've been working)
- This was a one-off missing config for a newer dc host
