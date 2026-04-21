# TS Temperature Alert System

## Current Setup

### Cron Job
- **Location:** `/etc/cron.d/ts-temp-monitor`
- **Schedule:** Every 10 minutes (`*/10 * * * *`)
- **Script:** `/workspace/scripts/ts-temp-alert-wrapper.sh`
- **Log:** `/workspace/logs/ts-temp-cron-output.log`

### How It Works

1. **Every 10 minutes**, cron runs the wrapper script
2. Script checks TS temps via `ipmitool sdr`
3. If any temp ≥ 60°C:
   - Outputs `[[TS_TEMP_ALERT]]` marker
   - Outputs full alert message
   - Exits with code 1
4. All output logged to `ts-temp-cron-output.log`

## Testing

### Manual Test
```bash
# Run the alert wrapper manually
/workspace/scripts/ts-temp-alert-wrapper.sh
```

### Check Logs
```bash
# View recent cron output
tail -20 /workspace/logs/ts-temp-cron-output.log

# View all alerts
cat /workspace/logs/ts-temp-cron-output.log | grep -A 20 "\[\[TS_TEMP_ALERT\]\]"
```

## Alert Message Format

When temps exceed threshold:
```
[[TS_TEMP_ALERT]]
🚨 **TS Server Temperature ALERT - 2026-04-12 22:07 UTC**
Temps ≥ 60°C:

```
CPU1 Temp        | 53 degrees C      | ok
...
Vcpu1VRM Temp    | 61 degrees C      | ok  <-- OVER THRESHOLD
...
```

⚠️ IMMEDIATE ATTENTION REQUIRED!
```

## Integration Options

### Option 1: Manual Check (Current)
Just read the log file or run the script manually.

### Option 2: OpenClaw System Event
Add a cron job in OpenClaw that runs the script and processes alerts:
```
Schedule: Every 10 minutes
Payload: bash /workspace/scripts/ts-temp-alert-wrapper.sh
```

### Option 3: Log File Watcher (Advanced)
Run a daemon that watches the log file and sends messages when it sees `[[TS_TEMP_ALERT]]`.

### Option 4: Direct Message Tool Call
Modify the wrapper to call the message tool directly (requires OpenClaw API access).

## Current Status

✅ **Monitoring:** Active every 10 minutes
✅ **Logging:** All readings logged
⚠️ **Chat Alerts:** Need to configure message tool integration

## Next Steps

1. **Test the system:**
   ```bash
   /workspace/scripts/ts-temp-alert-wrapper.sh
   ```

2. **Configure chat alerts** (choose one):
   - Add OpenClaw cron job
   - Run log watcher daemon
   - Modify wrapper for direct message calls

3. **Verify alert works:**
   - Check log file for `[[TS_TEMP_ALERT]]`
   - Confirm alert message in chat

---

**Created:** 2026-04-12 22:07 UTC
**Version:** 1.0
