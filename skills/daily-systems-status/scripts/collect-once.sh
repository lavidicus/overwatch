#!/bin/bash
# Collect system metrics ONCE and print a single JSON line, then exit.
# Hardware: TS (Proxmox host), Node1 (1x P6000 + llama.cpp), Node2 (1x P6000 + llama.cpp)
set -euo pipefail

# Get parent directory (where this script lives is scripts/)
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"

NODE1_HOST="node1"
NODE2_HOST="node2"

# ---- TS (Proxmox) ----
sensors=$(ssh -o ConnectTimeout=5 root@ts.9xc.local 'ipmitool sensor' 2>/dev/null || echo "")

get() { echo "$sensors" | awk -F'|' "/$1/ {gsub(/ /,\"\",\$2); print \$2; exit}"; }

cpu1=$(get "CPU1 Temp");  cpu2=$(get "CPU2 Temp")
sys=$(get "System Temp");  pch=$(get "PCH Temp");  perip=$(get "Peripheral Temp")
fan1=$(get "^FAN1 ");  fan2=$(get "^FAN2 ");  fan5=$(get "^FAN5 ")

# SAS Drive temperatures via helper on TS
drive_vals=$(ssh -o ConnectTimeout=5 root@ts.9xc.local '/usr/local/bin/ts-drive-temps.py' 2>/dev/null || echo "N/A N/A N/A N/A")
read -r td0 td1 td2 td3 <<< "$drive_vals"
norm() {
  v="$1"
  if [ -z "$v" ] || [ "$v" = "N/A" ] || ! echo "$v" | grep -qE '^[0-9]+$'; then
    echo "$perip"
  else
    echo "$v" | sed 's/^0\+\([0-9]\)/\1/'
  fi
}
td0=$(norm "$td0"); td1=$(norm "$td1"); td2=$(norm "$td2"); td3=$(norm "$td3")

# NVMe (fast-store) temperatures via helper on TS
nvme_vals=$(ssh -o ConnectTimeout=5 root@ts.9xc.local '/usr/local/bin/ts-nvme-temps.py' 2>/dev/null || echo "N/A N/A N/A N/A")
read -r nv0 nv1 nv2 nv3 <<< "$nvme_vals"

# ---- Helper: collect one node's data ----
collect_node() {
    local host=$1
    local label=$2

    local data=$(ssh -o ConnectTimeout=5 localadmin@${host} '
        echo "MEM_START"
        free -h | grep Mem | awk "{print \$3,\$7}"
        echo "MEM_END"
        echo "LLAMA_START"
        systemctl is-active llama-server.service 2>/dev/null || echo "unknown"
        systemctl show llama-server.service --property=MemoryCurrent 2>/dev/null | cut -d= -f2
        echo "LLAMA_END"
        echo "GPU_START"
        nvidia-smi --query-gpu=temperature.gpu,memory.used,memory.total,power.draw,power.limit,utilization.gpu --format=csv,noheader,nounits 2>/dev/null || echo "N/A"
        echo "GPU_END"
        echo "ROOT_START"
        df -h / | tail -1 | awk "{print \$5,\$3,\$2}"
        echo "ROOT_END"
    ' 2>/dev/null || echo "ERR")

    if [ "$data" = "ERR" ] || ! echo "$data" | grep -q "MEM_START"; then
        echo "{\"${label}\":{\"ram_used\":\"N/A\",\"ram_avail\":\"N/A\",\"llama_status\":\"unknown\",\"llama_mem\":\"N/A\",\"gpu_temp\":\"N/A\",\"gpu_mem\":\"N/A\",\"gpu_total\":24576,\"gpu_power\":\"N/A\",\"gpu_util\":\"null\",\"root_pct\":\"N/A\",\"root_used\":\"N/A\",\"root_total\":\"N/A\",\"llama_input_tps\":0,\"llama_output_tps\":0,\"llama_requests\":0}}"
        return
    fi

    # Parse memory
    local ram_line=$(echo "$data" | sed -n '/^MEM_START$/,/^MEM_END$/p' | grep -v '_START\|_END' | head -1)
    local ram_used=$(echo "$ram_line" | awk '{print $1}')
    local ram_avail=$(echo "$ram_line" | awk '{print $2}')

    # Parse llama
    local llama_line=$(echo "$data" | sed -n '/^LLAMA_START$/,/^LLAMA_END$/p' | grep -v '_START\|_END' | head -1)
    local llama_status="$llama_line"
    local llama_mem_raw=$(echo "$data" | sed -n '/^LLAMA_START$/,/^LLAMA_END$/p' | grep -v '_START\|_END' | tail -1)
    local llama_mem="N/A"
    if [ -n "$llama_mem_raw" ] && [ "$llama_mem_raw" != "[not set]" ] && echo "$llama_mem_raw" | grep -qE '^[0-9]+$'; then
        if [ "$llama_mem_raw" -gt 0 ] 2>/dev/null; then
            llama_mem=$(awk "BEGIN {printf \"%.1f\", $llama_mem_raw/1024/1024/1024}")
        fi
    fi

    # Parse GPU (single GPU per node)
    local gpu_line=$(echo "$data" | sed -n '/^GPU_START$/,/^GPU_END$/p' | grep -v '_START\|_END' | head -1)
    local gpu_temp=$(echo "$gpu_line" | cut -d',' -f1 | tr -d ' ')
    local gpu_mem=$(echo "$gpu_line" | cut -d',' -f2 | tr -d ' ')
    local gpu_total=$(echo "$gpu_line" | cut -d',' -f3 | tr -d ' ')
    local gpu_power=$(echo "$gpu_line" | cut -d',' -f4 | tr -d ' ')
    local gpu_util_raw=$(echo "$gpu_line" | cut -d',' -f6 | tr -d ' ')

    # Validate gpu_util
    local gpu_util="null"
    if [ -n "$gpu_util_raw" ] && [ "$gpu_util_raw" != "N/A" ]; then
        echo "$gpu_util_raw" | grep -qE '^[0-9]+$' && gpu_util="$gpu_util_raw"
    fi

    # Parse root
    local root_line=$(echo "$data" | sed -n '/^ROOT_START$/,/^ROOT_END$/p' | grep -v '_START\|_END' | head -1)
    local root_pct=$(echo "$root_line" | awk '{print $1}' | tr -d '%')
    local root_used=$(echo "$root_line" | awk '{print $2}')
    local root_total=$(echo "$root_line" | awk '{print $3}')

    # Llama tok/s metrics (best-effort)
    local llama_input_tps=0
    local llama_output_tps=0
    local llama_requests=0
    local toks_file="/home/localadmin/scripts/${label}-toks-per-sec.sh"
    local _toks=$(ssh -o ConnectTimeout=5 localadmin@${host} "bash ${toks_file}" 2>/dev/null || echo '{}')
    if [ -n "$_toks" ] && echo "$_toks" | grep -q '"input_tps"'; then
        llama_input_tps=$(echo "$_toks" | grep -oP '"input_tps":\K[0-9.]+')
        llama_output_tps=$(echo "$_toks" | grep -oP '"output_tps":\K[0-9.]+')
        llama_requests=$(echo "$_toks" | grep -oP '"requests":\K[0-9]+')
    fi
    llama_input_tps=${llama_input_tps:-0}
    llama_output_tps=${llama_output_tps:-0}
    llama_requests=${llama_requests:-0}

    echo "{\"${label}\":{\"ram_used\":\"${ram_used:-N/A}\",\"ram_avail\":\"${ram_avail:-N/A}\",\"llama_status\":\"${llama_status}\",\"llama_mem\":\"${llama_mem}\",\"gpu_temp\":\"${gpu_temp:-N/A}\",\"gpu_mem\":\"${gpu_mem:-N/A}\",\"gpu_total\":\"${gpu_total:-24576}\",\"gpu_power\":\"${gpu_power:-N/A}\",\"gpu_util\":${gpu_util},\"root_pct\":\"${root_pct:-N/A}\",\"root_used\":\"${root_used:-N/A}\",\"root_total\":\"${root_total:-N/A}\",\"llama_input_tps\":${llama_input_tps},\"llama_output_tps\":${llama_output_tps},\"llama_requests\":${llama_requests}}}"
}

# Collect both nodes in parallel
N1_JSON=$(collect_node "$NODE1_HOST" "node1")
N2_JSON=$(collect_node "$NODE2_HOST" "node2")

# Extract power for energy tracking (sum of both nodes)
N1_POWER=$(echo "$N1_JSON" | grep -oP '"gpu_power":"\K[0-9.]+' || echo "0")
N2_POWER=$(echo "$N2_JSON" | grep -oP '"gpu_power":"\K[0-9.]+' || echo "0")
total_power="N/A"
if [ -n "$N1_POWER" ] && [ "$N1_POWER" != "N/A" ] && [ -n "$N2_POWER" ] && [ "$N2_POWER" != "N/A" ]; then
    total_power=$(awk "BEGIN {printf \"%.1f\", ${N1_POWER} + ${N2_POWER}}")
fi

# ---- Accumulate daily energy usage ----
USAGE_FILE="$SCRIPT_DIR/daily-usage.txt"
DATE=$(date '+%Y-%m-%d')
CURRENT_TS=$(date +%s)

if [ -f "$USAGE_FILE" ]; then
    IFS=',' read -r LAST_DATE LAST_TOTAL LAST_UPDATE LAST_POWER < "$USAGE_FILE"
else
    LAST_DATE=$DATE; LAST_TOTAL=0; LAST_UPDATE=0; LAST_POWER=0
fi

if [ "$LAST_DATE" != "$DATE" ]; then
    TOTAL_WH=0; LAST_UPDATE=0; LAST_POWER=0
fi

if [ "$LAST_UPDATE" -gt 0 ] 2>/dev/null; then
    DELTA_SEC=$((CURRENT_TS - LAST_UPDATE))
    if [ "$DELTA_SEC" -gt 0 ] && [ "$total_power" != "N/A" ]; then
        ACCUM_WH=$(awk "BEGIN {printf \"%.2f\", ${total_power} * $DELTA_SEC / 3600}")
        TOTAL_WH=$(awk "BEGIN {printf \"%.2f\", ${LAST_TOTAL:-0} + $ACCUM_WH}")
    else
        TOTAL_WH=${LAST_TOTAL:-0}
    fi
else
    TOTAL_WH=${LAST_TOTAL:-0}
fi

echo "${DATE},${TOTAL_WH},${CURRENT_TS},${total_power}" > "$USAGE_FILE"

daily_kwh=$(awk "BEGIN {printf \"%.3f\", $TOTAL_WH / 1000}")
daily_cost=$(awk "BEGIN {printf \"%.2f\", $TOTAL_WH * 0.155 / 1000}")

# ---- GPU utilization history (combined from both nodes, last 60 readings each) ----
GPU_UTIL_FILE_N1="$SCRIPT_DIR/gpu-util-history-node1.jsonl"
GPU_UTIL_FILE_N2="$SCRIPT_DIR/gpu-util-history-node2.jsonl"

GPU_UTIL_HISTORY_N1="[]"
GPU_UTIL_HISTORY_N2="[]"

if [ -f "$GPU_UTIL_FILE_N1" ] && [ -s "$GPU_UTIL_FILE_N1" ]; then
    GPU_UTIL_HISTORY_N1=$(tail -n 60 "$GPU_UTIL_FILE_N1" | jq -s '.' 2>/dev/null || echo '[]')
fi
if [ -f "$GPU_UTIL_FILE_N2" ] && [ -s "$GPU_UTIL_FILE_N2" ]; then
    GPU_UTIL_HISTORY_N2=$(tail -n 60 "$GPU_UTIL_FILE_N2" | jq -s '.' 2>/dev/null || echo '[]')
fi

# Extract current util from history files as fallback
N1_UTIL_FALLBACK=$(tail -1 "$GPU_UTIL_FILE_N1" 2>/dev/null | jq -r '.gpu_util // "N/A"' 2>/dev/null || echo "N/A")
N2_UTIL_FALLBACK=$(tail -1 "$GPU_UTIL_FILE_N2" 2>/dev/null | jq -r '.gpu_util // "N/A"' 2>/dev/null || echo "N/A")

# Inject history into node JSONs (merge with jq)
N1_JSON=$(echo "$N1_JSON" | jq --argjson h "$GPU_UTIL_HISTORY_N1" '.node1.gpu_util_history = $h')
N2_JSON=$(echo "$N2_JSON" | jq --argjson h "$GPU_UTIL_HISTORY_N2" '.node2.gpu_util_history = $h')

# Merge everything
ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

# Build the full JSON with jq for correctness
jq -n \
  --arg ts "$ts" \
  --arg cpu1 "${cpu1:-N/A}" \
  --arg cpu2 "${cpu2:-N/A}" \
  --arg sys "${sys:-N/A}" \
  --arg pch "${pch:-N/A}" \
  --arg perip "${perip:-N/A}" \
  --arg fan1 "${fan1:-N/A}" \
  --arg fan2 "${fan2:-N/A}" \
  --arg fan5 "${fan5:-N/A}" \
  --arg td0 "$td0" \
  --arg td1 "$td1" \
  --arg td2 "$td2" \
  --arg td3 "$td3" \
  --arg nv0 "${nv0:-N/A}" \
  --arg nv1 "${nv1:-N/A}" \
  --arg nv2 "${nv2:-N/A}" \
  --arg nv3 "${nv3:-N/A}" \
  --arg total_power "$total_power" \
  --arg daily_kwh "$daily_kwh" \
  --arg daily_cost "$daily_cost" \
  --argjson n1 "$N1_JSON" \
  --argjson n2 "$N2_JSON" \
  '{
    timestamp: $ts,
    ts: {
      cpu1: $cpu1, cpu2: $cpu2, sys: $sys, pch: $pch, perip: $perip,
      fan1: $fan1, fan2: $fan2, fan5: $fan5,
      drive0_temp: $td0, drive1_temp: $td1, drive2_temp: $td2, drive3_temp: $td3,
      nvme0_temp: $nv0, nvme1_temp: $nv1, nvme2_temp: $nv2, nvme3_temp: $nv3
    },
    energy: {
      total_power: $total_power,
      daily_kwh: $daily_kwh,
      daily_cost: $daily_cost
    },
    node1: $n1.node1,
    node2: $n2.node2
  }'
