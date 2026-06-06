#!/bin/bash
# GPU Utilization Sampler
# Samples nvidia-smi utilization.gpu for node1 and node2 every INTERVAL seconds
# Stores in separate history files per node
# Cap: max 360 entries per file (~1h at 10s intervals)

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"
HISTORY_FILE_N1="${SCRIPT_DIR}/gpu-util-history-node1.jsonl"
HISTORY_FILE_N2="${SCRIPT_DIR}/gpu-util-history-node2.jsonl"
INTERVAL="${SAMPLER_INTERVAL:-10}"
MAX_ENTRIES=360

# Ensure history files exist
touch "$HISTORY_FILE_N1" "$HISTORY_FILE_N2"

sample_node() {
    local host=$1
    local history_file=$2
    local label=$3

    local ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    local ts_epoch=$(date +%s)

    local util=$(ssh -o ConnectTimeout=3 localadmin@${host} \
      "nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader,nounits" 2>/dev/null | head -1 | tr -d ' %')

    local gpu_util="null"
    if [ -n "$util" ] && [ "$util" != "N/A" ]; then
        echo "$util" | grep -qE '^[0-9]+$' && gpu_util="$util"
    fi

    echo "{\"ts\":\"$ts\",\"epoch\":$ts_epoch,\"gpu_util\":$gpu_util}" >> "$history_file"

    # Trim old entries
    local line_count=$(wc -l < "$history_file")
    if [ "$line_count" -gt "$MAX_ENTRIES" ]; then
        tail -n "$MAX_ENTRIES" "$history_file" > "${history_file}.tmp"
        mv "${history_file}.tmp" "$history_file"
    fi
}

while true; do
    sample_node "node1" "$HISTORY_FILE_N1" "node1" &
    sample_node "node2" "$HISTORY_FILE_N2" "node2" &
    wait
    sleep "$INTERVAL"
done
