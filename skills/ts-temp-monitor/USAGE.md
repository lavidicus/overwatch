# TS Temperature Monitor - Usage Guide

## Quick Commands

### Check Current Temps (One-Time)
```bash
# From any shell
~/openclaw/workspace/scripts/ts-temp
```

### Check with Chat Output
```bash
# This will print the formatted result to your terminal
~/openclaw/workspace/skills/ts-temp-monitor/monitor.sh --alert
```

### Run Full Alert Check
```bash
# Checks temps and generates alert if >60°C
~/openclaw/workspace/scripts/ts-temp-cron.sh
```

## From Chat

Simply say one of these:
- "Check TS temps"
- "Monitor TS server temperature"
- "Run temp check on TS"
- "Alert me if TS temps are high"

## Automated Monitoring

### Option 1: System Cron (Recommended)
Add this to your local crontab (`crontab -e`):
```
*/10 * * * * /home/localadmin/.openclaw/workspace/scripts/ts-temp-cron.sh
```

This runs every 10 minutes and generates alerts to a file.

### Option 2: OpenClaw Cron Job
Create a cron job in OpenClaw that calls the script:
```
Schedule: Every 10 minutes (600000ms)
Payload: bash /home/localadmin/.openclaw/workspace/scripts/ts-temp-cron.sh
```

## Alert Behavior

### Normal Operation (All Temps < 60°C)
- ✅ Reports current temperatures
- ✅ Logs to `logs/ts-temp-logs.txt`
- No alert sent

### Alert Triggered (Any Temp ≥ 60°C)
- 🚨 Generates alert message
- 📝 Logs to `logs/ts-temp-logs.txt`
- 🔔 Creates alert file in `logs/ts-temp-alert-YYYY-MM-DD_HH_MM.txt`
- ⚠️ Exit code 1 (can be used to trigger notifications)

## Configuration

### Change Threshold
Edit `THRESHOLD=60` in:
- `/workspace/skills/ts-temp-monitor/monitor.sh`
- `/workspace/scripts/ts-temp-cron.sh`

### Change Log Location
Edit `LOG_FILE` in the same scripts.

## Testing Alerts

To test the alert system:
```bash
# Temporarily lower threshold to test
sudo sed -i 's/THRESHOLD=60/THRESHOLD=50/' /workspace/scripts/ts-temp-cron.sh
/workspace/scripts/ts-temp-cron.sh

# Then restore it
sudo sed -i 's/THRESHOLD=50/THRESHOLD=60/' /workspace/scripts/ts-temp-cron.sh
```

## Integration Tips

### Send to Email
```bash
/workspace/scripts/ts-temp-cron.sh | mail -s "TS Temp Alert" jeremy.ingalls@gmail.com
```

### Send to Slack
```bash
/workspace/scripts/ts-temp-cron.sh | curl -X POST -d @- https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### Log to Database
```bash
/workspace/scripts/ts-temp-cron.sh >> /path/to/database.log 2>&1
```

---

**Last Updated:** 2026-04-12 22:06 UTC
**Version:** 1.0
