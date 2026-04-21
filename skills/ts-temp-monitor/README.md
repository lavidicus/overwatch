# TS Temperature Monitor - Full Documentation

## Overview

This skill monitors the TS server (Proxmox ESXi) hardware temperatures via IPMI and alerts if any sensor exceeds the configured threshold (default: 60°C).

## Architecture

```
┌─────────────┐     SSH      ┌─────────────┐
│   OpenClaw  │ ──────────▶ │     TS      │
│   Gateway   │             │ (ESXi Host) │
└─────────────┘             └─────────────┘
      │                           │
      │                           │ ipmitool sdr
      ▼                           │
┌─────────────┐                   │
│  monitor.sh │◀──────────────────┘
│   (skill)   │
└─────────────┘
      │
      ├──▶ Chat output (with --alert)
      └──▶ Log file: ~/workspace/logs/ts-temp-logs.txt
```

## Installation

### 1. Script Files
- ✅ `/workspace/skills/ts-temp-monitor/monitor.sh` - Main script
- ✅ `/workspace/skills/ts-temp-monitor/SKILL.md` - Skill metadata
- ✅ `/workspace/scripts/ts-temp` - Quick access wrapper

### 2. System Cron (on TS)
- ✅ `/etc/cron.d/ts-temp-monitor` - Runs every 10 minutes
- Requires: `ipmitool` installed on TS (already present)

## Usage Patterns

### One-time Check
```bash
# From any shell
~/openclaw/workspace/scripts/ts-temp

# With alert output
~/openclaw/workspace/scripts/ts-temp --alert
```

### From Chat
Just say:
- "Check TS temps"
- "Run temp check on TS"
- "Monitor TS server temperature"

The skill will automatically run and report results.

### Automated Monitoring

**Cron job installed on TS:**
```
*/10 * * * * root bash -c 'ipmitool sdr list 2>/dev/null | grep -E "Temp" | grep -v "no reading"' >> /home/localadmin/.openclaw/workspace/logs/ts-temp-logs.txt 2>&1
```

**Note:** This cron currently only logs to file. For chat alerts, use the `--alert` flag manually or set up a cron on the gateway that calls `ts-temp --alert`.

## Configuration

### Threshold
Edit `THRESHOLD=60` in `/workspace/skills/ts-temp-monitor/monitor.sh`

### Log Location
Edit `LOG_FILE` in the same script

### SSH Host
Edit `TS_HOST="root@ts"` in the same script

## Troubleshooting

### "Could not connect to TS"
- Check SSH key setup: `ssh root@ts`
- Verify TS is online and Tailscale/network is working

### "ipmitool: command not found"
- Install on TS: `apt-get install ipmitool`

### No temperatures showing
- Verify IPMI sensor data exists: `ssh root@ts 'ipmitool sdr list | grep Temp'`

### Cron not running
- Check cron service: `ssh root@ts 'ps aux | grep cron'`
- Verify cron file: `ssh root@ts 'cat /etc/cron.d/ts-temp-monitor'`
- Check cron logs: `ssh root@ts 'grep CRON /var/log/syslog'`

## Security

- SSH key-based authentication (no passwords)
- Script runs as `localadmin` user
- Logs written to workspace directory
- No external API calls

## Future Enhancements

- [ ] Add email/SMS alerts
- [ ] Historical trend graphs
- [ ] Multiple server support
- [ ] Configurable thresholds per sensor
- [ ] Slack/Discord integration

## Maintenance

**Weekly:**
- Check log file for unusual patterns
- Verify cron jobs are running

**Monthly:**
- Review threshold settings
- Clean old log entries (if needed)

---

**Author:** Sam 🧑‍💼  
**Created:** 2026-04-12  
**Last Updated:** 2026-04-12 22:02 UTC
