#!/bin/bash
# Aggregate daily GPU metrics into kWh and cost summary
set -euo pipefail
RATE_PER_KWH=0.16
DATE=${1:-$(date -u +%Y%m%d)}
LOG="/home/localadmin/logs/node1-llama-metrics-${DATE}.log"
OUT="/home/localadmin/logs/node1-llama-metrics-summary-${DATE}.json"

if [ ! -f "$LOG" ]; then
  echo "{\"date\":\"$DATE\",\"error\":\"no metrics log\"}" > "$OUT"
  exit 0
fi

# CSV: TS,GPU_IDX,POWER_W,UTIL_PC,MEM_MIB
awk -F"," '
  { c[$2]++; p[$2]+=$3; u[$2]+=$4 }
  END {
    first=1;
    printf "{\"date\":\"%s\",","'$DATE'";
    printf "\"gpus\":[";
    for (id in c) {
      avgP = p[id]/c[id];
      avgU = u[id]/c[id];
      if (!first) printf ","; first=0;
      printf "{\"id\":%d,\"avg_power_w\":%.2f,\"avg_util_pct\":%.2f}", id, avgP, avgU;
      totalP += avgP;
    }
    printf "],";
    kwh = (totalP/1000.0)*24.0;
    cost = kwh * RATE;
    printf "\"avg_total_power_w\":%.2f,", totalP;
    printf "\"kwh_per_day\":%.3f,", kwh;
    printf "\"cost_per_day_usd\":%.4f}", cost;
  }
' "$LOG" > "$OUT"
