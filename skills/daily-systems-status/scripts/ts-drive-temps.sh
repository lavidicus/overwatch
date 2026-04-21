#!/usr/bin/env bash
# Helper to return space-separated drive temperatures for sda sdb sdc sdd
set -euo pipefail

DEVICES=(sda sdb sdc sdd)
OUT=()
for d in "${DEVICES[@]}"; do
  val=""
  if command -v smartctl >/dev/null 2>&1; then
    out=$(smartctl -A /dev/${d} 2>/dev/null || true)
    # Try to find Temperature_Celsius attribute numeric value
    val=$(printf "%s" "$out" | awk '/Temperature_Celsius/ {for(i=1;i<=NF;i++) if($i ~ /^[0-9]+$/){print $i; exit}}')
    if [ -z "$val" ]; then
      # Fallback: any numeric token on a line containing 'Temperature'
      val=$(printf "%s" "$out" | awk '/Temperature/ {for(i=1;i<=NF;i++) if($i ~ /^[0-9]+$/){print $i; exit}}')
    fi
  fi
  if [ -z "$val" ]; then val="N/A"; fi
  OUT+=("$val")
done
printf "%s" "${OUT[0]} ${OUT[1]} ${OUT[2]} ${OUT[3]}"
