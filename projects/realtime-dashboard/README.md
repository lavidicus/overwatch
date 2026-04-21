# Real-time Systems Dashboard

A real-time monitoring dashboard for TS (Proxmox host) and Node2 (llama.cpp VM with 2x P6000 GPUs).

## Quick Start

```bash
# Start the dashboard
realtime-dashboard.sh start

# Check status
realtime-dashboard.sh status

# View logs
realtime-dashboard.sh logs

# Stop
realtime-dashboard.sh stop

# Restart
realtime-dashboard.sh restart
```

## Access

Open your browser and navigate to: **http://localhost:3000**

The dashboard updates every 30 seconds via WebSocket.

## Features

### TS Proxmox Host (172.16.254.5)
- CPU 1 & 2 temperatures
- System, PCH, and Peripheral temperatures
- Fan speeds (FAN1, FAN2, FAN5)

### Node2 VM (172.16.254.101)
- RAM usage and availability
- Root filesystem usage
- llama.cpp service status and memory
- **GPU 0 & 1**:
  - Temperature
  - VRAM usage (used/total)
  - Power draw (current/limit)
- **Power & Cost Tracking**:
  - Total GPU power (W)
  - Estimated daily energy (kWh)
  - Estimated daily cost (@ $0.155/kWh)

## Technical Details

- **Update Interval**: 30 seconds
- **Server**: Node.js + WebSocket
- **Data Collection**: Bash scripts SSH-ing to TS and Node2
- **WebSocket**: Real-time push updates to browser

## Files

- `server.js` - WebSocket server and HTML dashboard
- `scripts/realtime-dashboard.sh` - Data collection script
- `scripts/realtime-dashboard.sh` - Control script (alias)
- `~/.openclaw/logs/realtime-dashboard.log` - Server logs

## Daily HTML Report

For a static daily report (sent at 12:30 UTC), the original script generates:
```bash
bash ~/.openclaw/workspace/skills/daily-systems-status/scripts/daily-systems-status.sh
```

## Monitoring

The dashboard shows:
- 🟢 Green = Healthy
- 🟡 Yellow = Warning
- 🔴 Red = Critical

## Notes

- Requires SSH access to `ts.9xc.local` and `node2`
- Requires `node2/llamacpp` model for llama.cpp service status
- Works best when TS and Node2 are reachable from this gateway
