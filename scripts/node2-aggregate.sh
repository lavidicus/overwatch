#!/bin/bash
set -euo pipefail

RATE_PER_KWH=0.16
LOG="/home/localadmin/logs/node2-gpu-2026-04-18.log"
OUT="/home/localadmin/logs/node2-gpu-metrics-summary-20260418.json"

if [ ! -f "$LOG" ]; then
  echo "{\"date\":\"20260418\",\"error\":\"no metrics log found\"}"
  exit 1
fi

awk -F"," -v rate="$RATE_PER_KWH" '
{
  vram = $6+0
  if (vram > 20000) { g = 0 } else { g = 1 }
  c[g]++
  p[g] += $4
  u[g] += $8
  t[g] += $3
  v[g] += vram
  ts = $1
  if (NR == 1 || ts < ts_first) ts_first = ts
  if (NR == 1 || ts > ts_last) ts_last = ts
}
END {
  totalP = (p[0]/c[0]) + (p[1]/c[1])
  kwh = (totalP / 1000.0) * 24.0
  cost = kwh * rate

  printf "{\"date\":\"20260418\",\"total_samples\":%d,\n", NR
  printf "\"time_range\":{\"first\":\"%s\",\"last\":\"%s\"},\n", ts_first, ts_last
  printf "\"gpus\":[\n"
  for (g = 0; g <= 1; g++) {
    if (g > 0) printf ","
    printf "{\"id\":%d,\"samples\":%d,\"avg_power_w\":%.2f,\"avg_util_pct\":%.2f,\"avg_temp_c\":%.1f,\"avg_vram_mib\":%.0f}", g, c[g], p[g]/c[g], u[g]/c[g], t[g]/c[g], v[g]/c[g]
  }
  printf "\n],\n"
  printf "\"avg_total_power_w\":%.2f,\n", totalP
  printf "\"kwh_per_day\":%.3f,\n", kwh
  printf "\"cost_per_day_usd\":%.4f\n", cost
  printf "}\n"
}' "$LOG" > "$OUT"

cat "$OUT"
