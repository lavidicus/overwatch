#!/bin/bash
# TS Temperature Monitor Cron Script
# Runs on OpenClaw gateway every 10 minutes, alerts via system event if >60°C

TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')
LOG_FILE="/home/localadmin/.openclaw/workspace/logs/ts-temp-logs.txt"
TS_HOST="root@ts"
THRESHOLD=60

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Get temperature readings from TS
temps=$(ssh "$TS_HOST" 'ipmitool sdr list 2>/dev/null | grep -E "Temp" | grep -v "no reading"' 2>/dev/null)

# Check for alerts
over_threshold=0
while IFS= read -r line; do
    temp=$(echo "$line" | grep -oP '\|\s*\K\d+' || echo "0")
    if [[ -n "$temp" ]] && [[ "$temp" -ge "$THRESHOLD" ]]; then
        over_threshold=1
        break
    fi
done <<< "$temps"

# Log everything
echo "=== $TIMESTAMP ===" >> "$LOG_FILE"
echo "$temps" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

if [[ $over_threshold -eq 1 ]]; then
    # ALERT: Create formatted message
    alert_message="🚨 **TS Server Temperature ALERT - $TIMESTAMP**

Temps at or above ${THRESHOLD}°C detected:

\`\`\`
$temps
\`\`\`

⚠️ **IMMEDIATE ATTENTION REQUIRED!**

*Threshold: ${THRESHOLD}°C | Source: ipmitool sdr on TS*"
    
    # Write alert to a special file that the cron system will pick up
    # This is a simple approach - in production you'd use the cron API
    ALERT_FILE="/home/localadmin/.openclaw/workspace/logs/ts-temp-alert-${TIMESTAMP// /_}.txt"
    echo "$alert_message" > "$ALERT_FILE"
    
    # Also print to stdout so we can see it
    echo "🚨 ALERT GENERATED: $TIMESTAMP"
    echo "$alert_message"
    
    # Return exit code 1 to indicate alert was triggered
    exit 1
fi

# Normal case - no alert needed
exit 0
