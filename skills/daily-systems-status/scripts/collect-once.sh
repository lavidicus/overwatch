#!/bin/bash
# Collect system metrics ONCE and print a single JSON line, then exit.
set -euo pipefail

# Get parent directory (where this script lives is scripts/)
SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "${BASH_SOURCE[0]}")")/.." && pwd)"

NODE_HOST="node2"

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

# ---- Node2 (single SSH call for efficiency) ----
NODE2_DATA=$(ssh -o ConnectTimeout=5 localadmin@${NODE_HOST} '
  echo "MEM_START"
  free -h | grep Mem | awk "{print \$3,\$7}"
  echo "MEM_END"
  echo "LLAMA_START"
  systemctl is-active llama-server.service 2>/dev/null || echo "unknown"
  systemctl show llama-server.service --property=MemoryCurrent 2>/dev/null | cut -d= -f2
  echo "LLAMA_END"
  echo "GPU_START"
  nvidia-smi --query-gpu=temperature.gpu,memory.used,memory.total,power.draw,power.limit --format=csv,noheader,nounits 2>/dev/null || echo "N/A"
  echo "GPU_END"
  echo "ROOT_START"
  df -h / | tail -1 | awk "{print \$5,\$3,\$2}"
  echo "ROOT_END"
' 2>/dev/null || echo "ERR")

if [ "$NODE2_DATA" = "ERR" ] || ! echo "$NODE2_DATA" | grep -q "MEM_START"; then
    ram_used="N/A"; ram_avail="N/A"; llama_status="unknown"; llama_mem="N/A"
    gpu0_temp="N/A"; gpu1_temp="N/A"; gpu0_mem="N/A"; gpu1_mem="N/A"
    gpu0_total=24576; gpu1_total=24576; gpu0_power="N/A"; gpu1_power="N/A"
    root_pct="N/A"; root_used="N/A"; root_total="N/A"
else
    # Parse memory
    ram_line=$(echo "$NODE2_DATA" | sed -n '/^MEM_START$/,/^MEM_END$/p' | grep -v '_START\|_END' | head -1)
    ram_used=$(echo "$ram_line" | awk '{print $1}')
    ram_avail=$(echo "$ram_line" | awk '{print $2}')

    # Parse llama
    llama_line=$(echo "$NODE2_DATA" | sed -n '/^LLAMA_START$/,/^LLAMA_END$/p' | grep -v '_START\|_END' | head -1)
    llama_status="$llama_line"
    llama_mem_raw=$(echo "$NODE2_DATA" | sed -n '/^LLAMA_START$/,/^LLAMA_END$/p' | grep -v '_START\|_END' | tail -1)
    llama_mem="N/A"
    if [ -n "$llama_mem_raw" ] && [ "$llama_mem_raw" != "[not set]" ] && echo "$llama_mem_raw" | grep -qE '^[0-9]+$'; then
        if [ "$llama_mem_raw" -gt 0 ] 2>/dev/null; then
            llama_mem=$(awk "BEGIN {printf \"%.1f\", $llama_mem_raw/1024/1024/1024}")
        fi
    fi

    # Parse GPU
    gpu_block=$(echo "$NODE2_DATA" | sed -n '/^GPU_START$/,/^GPU_END$/p' | grep -v '_START\|_END' || echo "")
    gpu_val() { echo "$gpu_block" | sed -n "${1}p" | cut -d',' -f"$2" | tr -d ' '; }
    gpu0_temp=$(gpu_val 1 1);  gpu1_temp=$(gpu_val 2 1)
    gpu0_mem=$(gpu_val 1 2);   gpu1_mem=$(gpu_val 2 2)
    gpu0_total=$(gpu_val 1 3); gpu1_total=$(gpu_val 2 3)
    gpu0_power=$(gpu_val 1 4); gpu1_power=$(gpu_val 2 4)

    # Parse root
    root_line=$(echo "$NODE2_DATA" | sed -n '/^ROOT_START$/,/^ROOT_END$/p' | grep -v '_START\|_END' | head -1)
    root_pct=$(echo "$root_line" | awk '{print $1}' | tr -d '%')
    root_used=$(echo "$root_line" | awk '{print $2}')
    root_total=$(echo "$root_line" | awk '{print $3}')
fi

total_power="N/A"
if [ -n "$gpu0_power" ] && [ -n "$gpu1_power" ]; then
    total_power=$(awk "BEGIN {printf \"%.1f\", ${gpu0_power:-0} + ${gpu1_power:-0}}")
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

# ---- Llama tok/s metrics (best-effort, non-fatal) ----
LLAMA_INPUT_TPS="0"
LLAMA_OUTPUT_TPS="0"
LLAMA_REQUESTS="0"
_toks=$(ssh -o ConnectTimeout=5 localadmin@${NODE_HOST} 'bash /home/localadmin/scripts/node2-toks-per-sec.sh' 2>/dev/null || echo '{}')
if [ -n "$_toks" ] && echo "$_toks" | grep -q '"input_tps"'; then
    LLAMA_INPUT_TPS=$(echo "$_toks" | grep -oP '"input_tps":\K[0-9.]+')
    LLAMA_OUTPUT_TPS=$(echo "$_toks" | grep -oP '"output_tps":\K[0-9.]+')
    LLAMA_REQUESTS=$(echo "$_toks" | grep -oP '"requests":\K[0-9]+')
fi
LLAMA_INPUT_TPS=${LLAMA_INPUT_TPS:-0}
LLAMA_OUTPUT_TPS=${LLAMA_OUTPUT_TPS:-0}
LLAMA_REQUESTS=${LLAMA_REQUESTS:-0}

# ---- GPU utilization history (last 60 readings) ----
GPU_UTIL_FILE="$SCRIPT_DIR/gpu-util-history.jsonl"
GPU_UTIL_HISTORY="[]"
if [ -f "$GPU_UTIL_FILE" ] && [ -s "$GPU_UTIL_FILE" ]; then
    GPU_UTIL_HISTORY=$(tail -n 60 "$GPU_UTIL_FILE" | jq -s '.' 2>/dev/null || echo '[]')
fi
# Extract current latest util values
_GPU0=$(tail -1 "$GPU_UTIL_FILE" 2>/dev/null | jq -r '.gpu0_util // "N/A"' 2>/dev/null || echo "N/A")
_GPU1=$(tail -1 "$GPU_UTIL_FILE" 2>/dev/null | jq -r '.gpu1_util // "N/A"' 2>/dev/null || echo "N/A")
GPU0_UTIL="null"; [ "$_GPU0" != "N/A" ] && echo "$_GPU0" | grep -qE '^[0-9]+(\.[0-9]+)?$' && GPU0_UTIL="$_GPU0" || GPU0_UTIL="null"
GPU1_UTIL="null"; [ "$_GPU1" != "N/A" ] && echo "$_GPU1" | grep -qE '^[0-9]+(\.[0-9]+)?$' && GPU1_UTIL="$_GPU1" || GPU1_UTIL="null"

ts=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

cat <<EOF
{"timestamp":"${ts}","ts":{"cpu1":"${cpu1:-N/A}","cpu2":"${cpu2:-N/A}","sys":"${sys:-N/A}","pch":"${pch:-N/A}","perip":"${perip:-N/A}","fan1":"${fan1:-N/A}","fan2":"${fan2:-N/A}","fan5":"${fan5:-N/A}","drive0_temp":"${td0}","drive1_temp":"${td1}","drive2_temp":"${td2}","drive3_temp":"${td3}","nvme0_temp":"${nv0:-N/A}","nvme1_temp":"${nv1:-N/A}","nvme2_temp":"${nv2:-N/A}","nvme3_temp":"${nv3:-N/A}"},"node2":{"ram_used":"${ram_used:-N/A}","ram_avail":"${ram_avail:-N/A}","llama_status":"${llama_status}","llama_mem":"${llama_mem}","gpu0_temp":"${gpu0_temp:-N/A}","gpu1_temp":"${gpu1_temp:-N/A}","gpu0_mem":"${gpu0_mem:-N/A}","gpu1_mem":"${gpu1_mem:-N/A}","gpu0_total":"${gpu0_total:-24576}","gpu1_total":"${gpu1_total:-24576}","gpu0_power":"${gpu0_power:-N/A}","gpu1_power":"${gpu1_power:-N/A}","total_power":"${total_power}","daily_kwh":"${daily_kwh}","daily_cost":"${daily_cost}","root_pct":"${root_pct:-N/A}","root_used":"${root_used:-N/A}","root_total":"${root_total:-N/A}","llama_input_tps":"${LLAMA_INPUT_TPS}","llama_output_tps":"${LLAMA_OUTPUT_TPS}","llama_requests":${LLAMA_REQUESTS},"gpu0_util":${GPU0_UTIL},"gpu1_util":${GPU1_UTIL},"gpu_util_history":${GPU_UTIL_HISTORY}}}
EOF
