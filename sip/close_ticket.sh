#!/usr/bin/env bash
# sip/close_ticket.sh
# Usage: ./close_ticket.sh <ticket_id>

if [ "$#" -lt 1 ]; then
  echo "Usage: $0 <ticket_id>"
  exit 1
fi

ID=$1
TICKET_FILE=../sip/CHANGE_TICKETS.md
if [ ! -f "$TICKET_FILE" ]; then
  echo "Ticket file not found."
  exit 1
fi

# Update status to closed
awk -v id=$ID -F'|' '
  BEGIN {OFS="|"}
  $2 ~ id { $5 = "closed" }
  1
' "$TICKET_FILE" >> "$TICKET_FILE.tmp"

mv "$TICKET_FILE.tmp" "$TICKET_FILE"
chmod 644 "$TICKET_FILE"
echo "Ticket #$ID closed."
