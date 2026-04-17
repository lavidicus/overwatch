#!/bin/bash
# Send TS Temp Alert to Chat
# This script is meant to be called from OpenClaw cron or sessions_send

TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')
LOG_FILE="/home/localadmin/.openclaw/workspace/logs/ts-temp-logs.txt"
TS_HOST="root@ts"
THRESHOLD=60

mkdir -p "$(dirname "$LOG_FILE")"

# Get temps
temps=$(ssh "$TS_HOST" 'ipmitool sdr list 2>/dev/null | grep -E "Temp" | grep -v "no reading"' 2>/dev/null)

# Check for threshold
over_threshold=0
while IFS= read -r line; do
    temp=$(echo "$line" | grep -oP '\|\s*\K\d+' || echo "0")
    if [[ -n "$temp" ]] && [[ "$temp" -ge "$THRESHOLD" ]]; then
        over_threshold=1
        break
    fi
done <<< "$temps"

# Log
echo "=== $TIMESTAMP ===" >> "$LOG_FILE"
echo "$temps" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

if [[ $over_threshold -eq 1 ]]; then
    alert_message="🚨 **TS Server Temperature ALERT - $TIMESTAMP**

Temps at or above ${THRESHOLD}°C detected:

\`\`\`
$temps
\`\`\`

⚠️ **IMMEDIATE ATTENTION REQUIRED!**

*Threshold: ${THRESHOLD}°C | Source: ipmitool sdr on TS*"
    
    # Output the alert message in a format that can be captured
    echo "ALERT_MESSAGE: $alert_message"
    exit 1
else
    echo "OK_MESSAGE: ✅ TS Server Temperature OK - $TIMESTAMP (All temps < ${THRESHOLD}°C)"
    exit 0
fi
