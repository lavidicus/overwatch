# TS Temperature Monitor

**Monitor TS server temperatures via IPMI, alert if >60°C**

## Purpose
Check TS server (Proxmox ESXi) hardware temperatures via `ipmitool sdr` and alert if any sensor exceeds 60°C threshold.

## Usage

### Quick Check (one-time)
```bash
# Just run the check
~/openclaw/workspace/skills/ts-temp-monitor/monitor.sh
```

### Full Monitor with Alerts
```bash
# Run monitoring with chat alerts
~/openclaw/workspace/skills/ts-temp-monitor/monitor.sh --alert
```

### From Chat
Just say:
- "Check TS temps"
- "Monitor TS server temperature"
- "Run temp check on TS"

## What It Does

1. Runs `ipmitool sdr list | grep Temp` on TS via SSH
2. Parses temperature readings
3. Compares against 60°C threshold
4. **With --alert:** Sends formatted message to chat
5. **Always:** Logs to `/workspace/logs/ts-temp-logs.txt`

## Output Format

### Normal (OK)
```
✅ TS Server Temperature OK - 2026-04-12 22:01 UTC

Current temps:
```
CPU1 Temp        | 49 degrees C      | ok
CPU2 Temp        | 47 degrees C      | ok
...
```

All temps below 60°C threshold.
```

### Alert (Over threshold)
```
🚨 TS Server Temperature ALERT - 2026-04-12 22:01 UTC

Temps at or above 60°C detected:

```
CPU1 Temp        | 65 degrees C      | critical
...
```

⚠️ IMMEDIATE ATTENTION REQUIRED!
```

## Cron Job

A system cron is already installed on TS:
- **Location:** `/etc/cron.d/ts-temp-monitor`
- **Schedule:** Every 10 minutes
- **Logs to:** `/workspace/logs/ts-temp-logs.txt`

## Threshold

Default: **60°C**
- Change by editing `THRESHOLD=60` in `monitor.sh`

## Files

- `SKILL.md` - This file
- `monitor.sh` - Main script
- `README.md` - Full documentation (optional)
