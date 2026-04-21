#!/usr/bin/env bash
# add_entry.sh – append a new SIP entry in reverse chronological order
# Usage: ./add_entry.sh "<Title>" "<Idea>" "<Why>" "<Plan>" "<Notes>"

if [ "$#" -lt 5 ]; then
  echo "Usage: $0 <Title> <Idea> <Why> <Plan> <Notes>"
  exit 1
fi

TITLE=$1
IDEA=$2
WHY=$3
PLAN=$4
NOTES=$5
DATE=$(date -u +%F)

LOG="$(dirname "$0")/log.md"

# prepend the new entry at the top of the log after the header
TMP=$(mktemp)
{
  echo "# SIP Log"
  echo
  echo "## $DATE – $TITLE"
  echo "- **Idea:** $IDEA"
  echo "- **Why:** $WHY"
  echo "- **Plan:** $PLAN"
  echo "- **Status:** proposed"
  echo "- **Notes:** $NOTES"
  echo
  tail -n +2 "$LOG"
} > "$TMP"

mv "$TMP" "$LOG"
chmod 644 "$LOG"

echo "SIP entry added for $DATE – $TITLE"
