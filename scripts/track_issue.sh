#!/usr/bin/env bash
# scripts/track_issue.sh
# Usage: ./track_issue.sh "\u003cTitle\u003e" "\u003cNotes\u003e"

if [ "$#" -lt 2 ]; then
  echo "Usage: $0 \"<Title\u003e\" \"<Notes\u003e\""
  exit 1
fi

TITLE="$1"
NOTES="$2"
DATE=$(date -u +%F)

TICKET_FILE="../ISSUE_TICKETS.md"
if [ ! -f "$TICKET_FILE" ]; then
  echo "# ISSUE TICKETS" > "$TICKET_FILE"
  echo "| ID | Date | Title | Status | Notes |" >> "$TICKET_FILE"
  echo "|---|---|---|---|---|" >> "$TICKET_FILE"
fi

NEXT_ID=$(tail -n +2 "$TICKET_FILE" | grep -Eo '\| [0-9]+ ' | sort -n | tail -1 | tr -d '| ')
NEXT_ID=$((NEXT_ID+1))

printf "| %d | %s | %s | open | %s |
" "$NEXT_ID" "$DATE" "$TITLE" "$NOTES" >> "$TICKET_FILE"

chmod 644 "$TICKET_FILE"

echo "Issue ticket #$NEXT_ID created."
