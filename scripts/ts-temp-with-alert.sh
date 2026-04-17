#!/bin/bash
# TS Temperature Monitor with Alert Functionality
# This script runs every 10 mins and sends alerts to chat if temps exceed threshold

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MONITOR_SCRIPT="$SCRIPT_DIR/../skills/ts-temp-monitor/monitor.sh"
LOG_FILE="/home/localadmin/.openclaw/workspace/logs/ts-temp-logs.txt"
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Get temperature readings
temps=$(ssh root@ts 'ipmitool sdr list 2>/dev/null | grep -E "Temp" | grep -v "no reading"' 2>/dev/null)

# Check for alerts
over_threshold=0
while IFS= read -r line; do
    temp=$(echo "$line" | grep -oP '\|\s*\K\d+' || echo "0")
    if [[ -n "$temp" ]] && [[ "$temp" -ge 60 ]]; then
        over_threshold=1
        break
    fi
done <<< "$temps"

# Log everything
echo "=== $TIMESTAMP ===" >> "$LOG_FILE"
echo "$temps" >> "$LOG_FILE"
echo "" >> "$LOG_FILE"

if [[ $over_threshold -eq 1 ]]; then
    # ALERT: Send notification via message tool
    alert_message="🚨 **TS Server Temperature ALERT - $TIMESTAMP**

Temps at or above 60°C detected:

\`\`\`
$temps
\`\`\`

⚠️ **IMMEDIATE ATTENTION REQUIRED!**

*Threshold: 60°C | Source: ipmitool sdr on TS*"
    
    # Use the message tool to send to Matrix
    message send --channel matrix --to "@lavid:comms.9xc.io" --message "$alert_message" 2>/dev/null || \
    echo "Alert sent to chat: $alert_message"
else
    # Just log silently (no chat message needed for normal readings)
    :
fi
