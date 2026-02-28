#!/usr/bin/env bash
# scripts/token_audit.sh
# Parse agents/main/sessions.json to calculate total token usage per day

SESSION_FILE="~/.openclaw/agents/main/sessions.jsonl"
if [ ! -f "$SESSION_FILE" ]; then
  echo "Session file not found."
  exit 1
fi

# Extract dates and totalTokens, sum per day
awk 'BEGIN{FS="\n"}{gsub(/[^0-9]/,"",$0);}
' $SESSION_FILE | grep -Eo '202[0-9]{6}' | sort | uniq -c > ~/.openclaw/workspace/memory/2026-02-27.md

echo "Token audit completed."
