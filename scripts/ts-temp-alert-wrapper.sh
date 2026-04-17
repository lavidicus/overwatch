#!/bin/bash
# TS Temp Alert Wrapper - Outputs special marker for OpenClaw to intercept
# This allows the cron system to detect and handle alerts

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
    alert="🚨 **TS Server Temperature ALERT - $TIMESTAMP**
Temps ≥ ${THRESHOLD}°C:

\`\`\`
$temps
\`\`\`

⚠️ IMMEDIATE ATTENTION REQUIRED!"
    
    # Output with special marker for OpenClaw interception
    echo "[[TS_TEMP_ALERT]]"
    echo "$alert"
    exit 1
else
    echo "✅ TS Server OK - $TIMESTAMP (All temps < ${THRESHOLD}°C)"
    exit 0
fi
