#!/bin/bash
# Daily Token Count - aggregates token usage from all session transcripts
# Outputs JSON array sorted by date (most-recent first)
# Uses .timestamp (ISO string) not .message.timestamp (numeric ms)
# Filters out deleted/reset backup files

SESSIONS_DIR=~/.openclaw/agents/main/sessions
EXCLUDE_FLAGS=""
for f in .deleted .reset .backup; do
  EXCLUDE_FLAGS="$EXCLUDE_FLAGS -not -name '*$f*'"
done

find "$SESSIONS_DIR" -name "*.jsonl" $EXCLUDE_FLAGS 2>/dev/null | \
  xargs cat 2>/dev/null | \
  jq -s '
    [.[] | select(.message != null and .message.usage != null and .message.usage.totalTokens != null)] |
    group_by(.timestamp | tostring | split("T")[0]) |
    map({
      date: .[0].timestamp | tostring | split("T")[0],
      total_tokens: (map(.message.usage.totalTokens // 0) | add),
      input_tokens: (map(.message.usage.input // 0) | add),
      output_tokens: (map(.message.usage.output // 0) | add),
      model_count: length
    }) |
    sort_by(.date) |
    reverse
  ' 2>/dev/null
