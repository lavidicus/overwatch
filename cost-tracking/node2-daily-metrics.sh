#!/bin/bash
#
# node2-daily-metrics.sh — Multiple daily samples for accurate cost tracking
# Usage: bash ~/.openclaw/workspace/cost-tracking/node2-daily-metrics.sh
#
# Takes 4 samples per day (06:00, 12:00, 18:00, 00:00 UTC) to capture
# actual GPU power usage patterns throughout the day.

set -euo pipefail

NODE="localadmin@node2"
OUTPUT_DIR="$HOME/.openclaw/workspace/cost-tracking/daily"
LOG_FILE="$HOME/.openclaw/workspace/cost-tracking/node2-metrics.log"

mkdir -p "$OUTPUT_DIR"

DATE=$(date +%Y-%m-%d)
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)

echo "[$TIMESTAMP] Starting node2 metrics collection..." >> "$LOG_FILE"

# Collect new samples for today
NEW_SAMPLES=0

for HOUR in 06 12 18 00; do
    SAMPLE_FILE="$OUTPUT_DIR/node2-${DATE}-sample-${HOUR}.json"
    
    # Only collect if this sample doesn't exist yet
    if [ ! -f "$SAMPLE_FILE" ]; then
        RAW=$(ssh -o ConnectTimeout=10 -o BatchMode=yes "$NODE" '
            CPU_MODEL=$(grep "model name" /proc/cpuinfo | head -1 | cut -d: -f2 | xargs)
            CPU_CORES=$(nproc)
            RAM_TOTAL=$(grep MemTotal /proc/meminfo | awk "{print int(\$2/1024)}")
            RAM_AVAIL=$(grep MemAvailable /proc/meminfo | awk "{print int(\$2/1024)}")
            RAM_USED=$((RAM_TOTAL - RAM_AVAIL))
            GPU0_TEMP=$(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits 2>/dev/null | sed -n "1p" | xargs)
            GPU1_TEMP=$(nvidia-smi --query-gpu=temperature.gpu --format=csv,noheader,nounits 2>/dev/null | sed -n "2p" | xargs)
            GPU0_MEM=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits 2>/dev/null | sed -n "1p" | xargs)
            GPU1_MEM=$(nvidia-smi --query-gpu=memory.used --format=csv,noheader,nounits 2>/dev/null | sed -n "2p" | xargs)
            GPU0_PWR=$(nvidia-smi --query-gpu=power.draw --format=csv,noheader,nounits 2>/dev/null | sed -n "1p" | xargs)
            GPU1_PWR=$(nvidia-smi --query-gpu=power.draw --format=csv,noheader,nounits 2>/dev/null | sed -n "2p" | xargs)
            GPU0_UTIL=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader 2>/dev/null | sed -n "1p" | awk -F"," "{print \$1}" | xargs | tr -d "% ")
            GPU1_UTIL=$(nvidia-smi --query-gpu=utilization.gpu --format=csv,noheader 2>/dev/null | sed -n "2p" | awk -F"," "{print \$1}" | xargs | tr -d "% ")
            GPU0_CLOCK=$(nvidia-smi --query-gpu=clocks.current.graphics --format=csv,noheader,nounits 2>/dev/null | sed -n "1p" | xargs | tr -d " ")
            GPU1_CLOCK=$(nvidia-smi --query-gpu=clocks.current.graphics --format=csv,noheader,nounits 2>/dev/null | sed -n "2p" | xargs | tr -d " ")
            DISK_USAGE=$(df -h / | tail -1 | awk "{print \$5}")
            DISK_USED=$(df -h / | tail -1 | awk "{print \$3}")
            DISK_TOTAL=$(df -h / | tail -1 | awk "{print \$2}")
            UPTIME=$(awk "{print int(\$1/3600)}" /proc/uptime)
            PERSIST=$(nvidia-smi -q | grep -i "persistence mode" | head -1 | awk -F: "{print \$2}" | xargs)
            
            echo "CPU_MODEL=$CPU_MODEL"
            echo "CPU_CORES=$CPU_CORES"
            echo "RAM_TOTAL=$RAM_TOTAL"
            echo "RAM_USED=$RAM_USED"
            echo "GPU0_TEMP=${GPU0_TEMP:-0}"
            echo "GPU1_TEMP=${GPU1_TEMP:-0}"
            echo "GPU0_MEM=${GPU0_MEM:-0}"
            echo "GPU1_MEM=${GPU1_MEM:-0}"
            echo "GPU0_PWR=${GPU0_PWR:-0}"
            echo "GPU1_PWR=${GPU1_PWR:-0}"
            echo "GPU0_UTIL=${GPU0_UTIL:-0}"
            echo "GPU1_UTIL=${GPU1_UTIL:-0}"
            echo "GPU0_CLOCK=${GPU0_CLOCK:-0}"
            echo "GPU1_CLOCK=${GPU1_CLOCK:-0}"
            echo "DISK_USAGE=$DISK_USAGE"
            echo "DISK_USED=$DISK_USED"
            echo "DISK_TOTAL=$DISK_TOTAL"
            echo "UPTIME=$UPTIME"
            echo "PERSIST=$PERSIST"
        ' 2>> "$LOG_FILE")
        
        get_val() { echo "$RAW" | grep "^${1}=" | head -1 | cut -d= -f2-; }
        
        CPU_MODEL=$(get_val "CPU_MODEL")
        CPU_CORES=$(get_val "CPU_CORES" || echo "0")
        RAM_TOTAL=$(get_val "RAM_TOTAL" || echo "0")
        RAM_USED=$(get_val "RAM_USED" || echo "0")
        GPU0_TEMP=$(get_val "GPU0_TEMP" || echo "0")
        GPU1_TEMP=$(get_val "GPU1_TEMP" || echo "0")
        GPU0_MEM=$(get_val "GPU0_MEM" || echo "0")
        GPU1_MEM=$(get_val "GPU1_MEM" || echo "0")
        GPU0_PWR=$(get_val "GPU0_PWR" || echo "0")
        GPU1_PWR=$(get_val "GPU1_PWR" || echo "0")
        GPU0_UTIL=$(get_val "GPU0_UTIL" || echo "0")
        GPU1_UTIL=$(get_val "GPU1_UTIL" || echo "0")
        GPU0_CLOCK=$(get_val "GPU0_CLOCK" || echo "0")
        GPU1_CLOCK=$(get_val "GPU1_CLOCK" || echo "0")
        DISK_USAGE=$(get_val "DISK_USAGE" || echo "0%")
        DISK_USED=$(get_val "DISK_USED" || echo "0")
        DISK_TOTAL=$(get_val "DISK_TOTAL" || echo "0")
        UPTIME=$(get_val "UPTIME" || echo "0")
        PERSIST=$(get_val "PERSIST" || echo "Unknown")
        
        GPU0_PWR_NUM=$(echo "$GPU0_PWR" | grep -oE '[0-9.]+' || echo "0")
        GPU1_PWR_NUM=$(echo "$GPU1_PWR" | grep -oE '[0-9.]+' || echo "0")
        TOTAL_GPU_PWR=$(awk "BEGIN {printf \"%.2f\", $GPU0_PWR_NUM + $GPU1_PWR_NUM}")
        SYSTEM_PWR=100
        TOTAL_SYSTEM_PWR=$(awk "BEGIN {printf \"%.2f\", $TOTAL_GPU_PWR + $SYSTEM_PWR}")
        
        cat > "$SAMPLE_FILE" <<ENDJSON
{
  "date": "$DATE",
  "hour": "$HOUR",
  "timestamp": "$TIMESTAMP",
  "hardware": {
    "cpu": "$CPU_MODEL",
    "cpu_cores": $CPU_CORES,
    "ram_total_gb": $RAM_TOTAL,
    "ram_used_gb": $RAM_USED,
    "gpus": [
      {"name": "Quadro P6000", "index": 0, "temp_c": $GPU0_TEMP, "mem_used_mb": $GPU0_MEM, "power_w": $GPU0_PWR_NUM, "util_pct": $GPU0_UTIL, "clock_mhz": $GPU0_CLOCK},
      {"name": "Quadro P6000", "index": 1, "temp_c": $GPU1_TEMP, "mem_used_mb": $GPU1_MEM, "power_w": $GPU1_PWR_NUM, "util_pct": $GPU1_UTIL, "clock_mhz": $GPU1_CLOCK}
    ],
    "disk_total": "$DISK_TOTAL",
    "disk_used": "$DISK_USED",
    "disk_usage_pct": "$DISK_USAGE",
    "uptime_hours": $UPTIME,
    "persistence_mode": "$PERSIST"
  },
  "power": {
    "gpu0_w": $GPU0_PWR_NUM,
    "gpu1_w": $GPU1_PWR_NUM,
    "total_gpu_w": $TOTAL_GPU_PWR,
    "system_w": $SYSTEM_PWR,
    "total_system_w": $TOTAL_SYSTEM_PWR
  }
}
ENDJSON

        NEW_SAMPLES=$((NEW_SAMPLES + 1))
    fi
done

# Always recalculate daily summary from ALL existing samples for today
SAMPLE_COUNT=$(ls "$OUTPUT_DIR"/node2-${DATE}-sample-*.json 2>/dev/null | wc -l)

if [ "$SAMPLE_COUNT" -gt 0 ]; then
    # Sum all sample power readings
    TOTAL_POWER=$(cat "$OUTPUT_DIR"/node2-${DATE}-sample-*.json 2>/dev/null | jq -s '[.[].power.total_system_w] | add')
    AVG_POWER=$(awk "BEGIN {printf \"%.2f\", $TOTAL_POWER / $SAMPLE_COUNT}")
    DAILY_KWH=$(awk "BEGIN {printf \"%.3f\", ($AVG_POWER / 1000) * 24}")
    DAILY_ELEC_COST=$(awk "BEGIN {printf \"%.4f\", $DAILY_KWH * 0.155}")
    TOTAL_DAILY=$DAILY_ELEC_COST
    
    # Write daily summary
    cat > "$OUTPUT_DIR/node2-${DATE}.json" <<ENDJSON
{
  "date": "$DATE",
  "timestamp": "$TIMESTAMP",
  "samples_collected": $SAMPLE_COUNT,
  "new_samples": $NEW_SAMPLES,
  "sample_interval_hours": 6,
  "average_power_w": $AVG_POWER,
  "estimated_daily_kwh": $DAILY_KWH,
  "costs": {
    "electricity_daily": $DAILY_ELEC_COST,
    "total_daily": $TOTAL_DAILY
  }
}
ENDJSON
    
    echo "[$TIMESTAMP] $SAMPLE_COUNT samples (new: $NEW_SAMPLES). Avg power: ${AVG_POWER}W | Elec: \$$DAILY_ELEC_COST/day | Total: \$$TOTAL_DAILY/day" >> "$LOG_FILE"
else
    echo "[$TIMESTAMP] No samples collected for $DATE" >> "$LOG_FILE"
fi
