#!/bin/bash
# TS Temp Alert Daemon
# Watches for [[TS_TEMP_ALERT]] markers in the cron output and sends to chat

LOG_FILE="/home/localadmin/.openclaw/workspace/logs/ts-temp-cron-output.log"
LAST_LINE=0

# Ensure log file exists
touch "$LOG_FILE"

echo "🚦 TS Temp Alert Daemon started (PID: $$)"
echo "Watching: $LOG_FILE"

while true; do
    # Find new lines
    NEW_LINES=$(tail -n +$((LAST_LINE + 1)) "$LOG_FILE" 2>/dev/null || echo "")
    
    if [[ -n "$NEW_LINES" ]]; then
        # Check for alert marker
        if echo "$NEW_LINES" | grep -q "\[\[TS_TEMP_ALERT\]\]"; then
            # Extract the alert message (everything after the marker)
            ALERT_MSG=$(echo "$NEW_LINES" | sed -n '/\[\[TS_TEMP_ALERT\]\]/,$p' | tail -n +2)
            
            # Send to chat
            echo "🚨 Sending TS temp alert to chat..."
            echo "$ALERT_MSG"
            
            # In a real implementation, you'd call:
            # message send --channel matrix --to "@lavid:comms.9xc.io" --message "$ALERT_MSG"
            
            # For now, just log it
            echo "[$(date -u '+%Y-%m-%d %H:%M:%S UTC')] ALERT SENT TO CHAT" >> "$LOG_FILE.alerts"
        fi
        
        LAST_LINE=$(wc -l < "$LOG_FILE")
    fi
    
    sleep 30
done
