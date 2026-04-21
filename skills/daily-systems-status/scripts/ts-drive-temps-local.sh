#!/bin/bash
set -euo pipefail
DEVICES=(sda sdb sdc sdd)
OUT=()
for d in "${DEVICES[@]}"; do
  out=$(smartctl -A /dev/${d} 2>/dev/null || true)
  tmp=$(printf "%s\n" "$out" | sed -n -E 's/.*Temperature_Celsius[^0-9]*([0-9]{1,3}).*/\1/p' | head -1)
  if [ -z "$tmp" ]; then
    tmp=$(printf "%s\n" "$out" | sed -n -E 's/.*Temperature[^0-9]*([0-9]{1,3}).*/\1/p' | head -1)
  fi
  if [ -z "$tmp" ]; then tmp="N/A"; fi
  OUT+=("$tmp")
done
printf "%s" "${OUT[0]} ${OUT[1]} ${OUT[2]} ${OUT[3]}"
