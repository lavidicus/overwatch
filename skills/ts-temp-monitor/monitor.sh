#!/bin/bash
# TS Server Temperature Monitor
# Check TS temps via IPMI, alert if >60°C
# Usage: monitor.sh [--alert]

set -euo pipefail

# Configuration
THRESHOLD=60
TIMESTAMP=$(date -u '+%Y-%m-%d %H:%M UTC')
LOG_FILE="/home/localadmin/.openclaw/workspace/logs/ts-temp-logs.txt"
TS_HOST="root@ts"

# Parse arguments
ALERT_MODE=false
if [[ "${1:-}" == "--alert" ]]; then
    ALERT_MODE=true
fi

# Ensure log directory exists
mkdir -p "$(dirname "$LOG_FILE")"

# Get temperature readings from TS
get_temps() {
    ssh "$TS_HOST" 'ipmitool sdr list 2>/dev/null | grep -E "Temp" | grep -v "no reading"' 2>/dev/null || echo "ERROR: Could not connect to TS or no IPMI data"
}

# Main function
main() {
    local temps
    temps=$(get_temps)
    
    # Check for alerts
    local over_threshold=0
    while IFS= read -r line; do
        local temp
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
    
    if [[ "$ALERT_MODE" == true ]]; then
        if [[ $over_threshold -eq 1 ]]; then
            # Alert mode: send to chat
            echo "🚨 TS Server Temperature ALERT - $TIMESTAMP"
            echo ""
            echo "Temps at or above ${THRESHOLD}°C detected:"
            echo ""
            echo "\`\`\`"
            echo "$temps"
            echo "\`\`\`"
            echo ""
            echo "⚠️ IMMEDIATE ATTENTION REQUIRED!"
        else
            # Normal mode: send to chat
            echo "✅ TS Server Temperature OK - $TIMESTAMP"
            echo ""
            echo "Current temps:"
            echo "\`\`\`"
            echo "$temps"
            echo "\`\`\`"
            echo ""
            echo "All temps below ${THRESHOLD}°C threshold."
        fi
    fi
    
    # Return success
    return 0
}

main "$@"
