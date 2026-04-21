#!/bin/bash
# GPU Utilization Sampler
# Samples nvidia-smi utilization.gpu every INTERVAL seconds, stores in HISTORY_FILE
# Cap: max 600 entries (30 min at 3s, or however long INTERVAL is)

NODE_HOST="${NODE_HOST:-node2}"
HISTORY_FILE="${HISTORY_FILE:-/home/localadmin/.openclaw/workspace/skills/daily-systems-status/gpu-util-history.jsonl}"
INTERVAL="${SAMPLER_INTERVAL:-10}"
MAX_ENTRIES=360  # 1h at 10s intervals

# Ensure history file exists
touch "$HISTORY_FILE"

while true; do
    ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    ts_epoch=$(date +%s)

    stats=$(ssh -o ConnectTimeout=3 localadmin@${NODE_HOST} \
      "nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits" 2>/dev/null || echo -e "N/A\nN/A")

    gpu0_util=$(echo "$stats" | sed -n '1p' | tr -d ' %')
    gpu1_util=$(echo "$stats" | sed -n '2p' | tr -d ' %')

    # Default to null if N/A or empty, and validate it's a number
    gpu0_util="${gpu0_util:-null}"
    gpu1_util="${gpu1_util:-null}"
    echo "$gpu0_util" | grep -qE '^[0-9]+$' || gpu0_util="null"
    echo "$gpu1_util" | grep -qE '^[0-9]+$' || gpu1_util="null"

    echo "{\"ts\":\"$ts\",\"epoch\":$ts_epoch,\"gpu0_util\":$gpu0_util,\"gpu1_util\":$gpu1_util}" >> "$HISTORY_FILE"

    # Trim old entries
    line_count=$(wc -l < "$HISTORY_FILE")
    if [ "$line_count" -gt "$MAX_ENTRIES" ]; then
        tail -n "$MAX_ENTRIES" "$HISTORY_FILE" > "${HISTORY_FILE}.tmp"
        mv "${HISTORY_FILE}.tmp" "$HISTORY_FILE"
    fi

    sleep "$INTERVAL"
done
