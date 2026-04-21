#!/bin/bash
# Remote scraper for Node1 GPU metrics — append CSV lines to /home/localadmin/logs/node1-llama-metrics-YYYYMMDD.log
set -euo pipefail
DATE=$(date -u +%Y%m%d)
LOG="/home/localadmin/logs/node1-llama-metrics-${DATE}.log"
TS=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
# Query: power.draw (W), utilization.gpu (%), memory.used (MiB)
# Output one line per GPU in CSV: TIMESTAMP,GPU_INDEX,POWER_W,UTIL_PC,MEM_MIB
nvidia-smi --query-gpu=power.draw,utilization.gpu,memory.used --format=csv,noheader,nounits 2>/dev/null |
 awk -v ts="$TS" 'BEGIN{gpu=0} {gsub(/ /,""); split($0,a,","); power=a[1]; util=a[2]; mem=a[3]; print ts "," gpu "," power "," util "," mem; gpu++}' >> "$LOG"
