#!/usr/bin/env bash
set -euo pipefail
DEVS=(sda sdb sdc sdd)
for d in "${DEVS[@]}"; do
  val=$(smartctl -a /dev/${d} 2>/dev/null | sed -n "s/.*Temperature_Celsius.* \([0-9][0-9]*\) .*/\1/p" | head -1)
  if [ -z "$val" ]; then
    val=$(smartctl -a /dev/${d} 2>/dev/null | sed -n "s/.*Temperature.* \([0-9][0-9]*\).*/\1/p" | head -1)
  fi
  if [ -z "$val" ]; then val="N/A"; fi
  printf "%s " "$val"
done
