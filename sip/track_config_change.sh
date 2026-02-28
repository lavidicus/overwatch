#!/usr/bin/env bash
# sip/track_config_change.sh
# Usage: ./track_config_change.sh "<description>" "<notes>"

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 \"<description>\" \"<notes>\""
  exit 1
fi

DESC="$1"
NOTES="$2"
DATE=$(date -u +%F)
REQUESTER="Jeremy"

# Ensure change ticket file exists
TICKET_FILE="CHANGE_TICKETS.md"
if [ ! -f "$TICKET_FILE" ]; then
  echo "# Change Tickets" > "$TICKET_FILE"
  echo "| ID | Date | Requester | Description | Status | Notes |" >> "$TICKET_FILE"
  echo "|---|---|---|---|---|---|" >> "$TICKET_FILE"
fi

# Determine next ID
NEXT_ID=$(tail -n +2 "$TICKET_FILE" | grep -Eo '\| [0-9]+ ' | sort -n | tail -1 | tr -d '| ')
NEXT_ID=$((NEXT_ID+1))

# Append new ticket
printf "| %d | %s | %s | %s | open | %s |\n" "$NEXT_ID" "$DATE" "$REQUESTER" "$DESC" "$NOTES" >> "$TICKET_FILE"

# Log change in SIP log
LOG="log.md"
cat <<'EOF' >> "$LOG"
## $DATE – Change Ticket #$NEXT_ID
- **Idea:** $DESC
- **Why:** Log configuration change
- **Plan:** Record ticket and document in SIP
- **Status:** proposed
- **Notes:** $NOTES

EOF

chmod 644 "$TICKET_FILE"
chmod 644 "$LOG"

echo "Change ticket #$NEXT_ID created and logged."
