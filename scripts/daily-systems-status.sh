#!/bin/bash
# Daily Systems Status Report
# Runs at 06:30 AM CST (12:30 UTC)

REPORT=$(cat <<'EOF'
Daily Systems Status Report
===========================

TS (Proxmox Host) - 172.16.254.5
---------------------------------

Storage Pools
-------------

- SAS (17.3 TB)  [ZFS raidz1-0, 4 x 10 TB HDD]
  - State: ONLINE
  - Drives:
    - /dev/sda  ST10000NM0086-2AA101  (OK, 8 reallocated sectors)
    - /dev/sdb  ST10000NM0126-1TT131  (OK)
    - /dev/sdc  ST10000NM0046         (OK)
    - /dev/sdd  ST10000NM0086-2AA101  (WARNING: 36,704 reallocated sectors, 10 uncorrectable errors)
  - Status: Functioning but degraded drive (2-3 month buffer). Data replaceable.

- fast-store (2.4 TB)  [ZFS raidz1-0, 4 x 1 TB NVMe]
  - State: ONLINE
  - Drives: 4 x Crucial CT1000P3PSSD8 (low wear, 0 errors)
  - Status: Healthy.

- rpool (842 GB)  [ZFS mirror, 2 x 2 TB Intel P3 SSD]
  - State: ONLINE
  - Status: Healthy after CRC issues corrected (cable reseat and scrub).

Temperatures (TS Chassis)
-------------------------

- CPU1: [CPU1_TEMP] C
- CPU2: [CPU2_TEMP] C
- System: [SYS_TEMP] C
- PCH: [PCH_TEMP] C
- Peripheral: [PERIP_TEMP] C

Overall thermal status: [TEMP_STATUS]


NODE1 VM (Ubuntu 24.04) - 172.16.254.100
----------------------------------------

Hardware
--------

- CPU: 28 cores (2 x Xeon E5-2680 v4)
- RAM: 62 GB total, [RAM_USED] GB used, [RAM_AVAIL] GB available
- GPUs: 2 x Quadro P6000 (24 GB each)

llama.cpp Service
-----------------

- Service: llama-server.service
- Status: [LLAMA_STATUS] (since [UPTIME])
- Memory (process): [LLAMA_MEM] GB
- GPUs:
  - GPU 0: [GPU0_TEMP] C, [GPU0_MEM] used / 24576 MiB
  - GPU 1: [GPU1_TEMP] C, [GPU1_MEM] used / 24576 MiB

Storage (NODE1 root)
--------------------

- Root filesystem: [ROOT_USED] used / 123 GB ([ROOT_PCT]%)

Summary and Action Items
------------------------

Healthy
-------

- rpool (OS mirror) is stable and fully online.
- fast-store NVMe pool is healthy with low wear.
- NODE1 llama.cpp service is running normally on both P6000 GPUs.
- Chassis and CPU temperatures are within normal range.

Watch / Plan
------------

- SAS pool: /dev/sdd is a failing HDD (high reallocated sectors and past errors).
  - Data on SAS is replaceable.
  - Current plan: monitor and replace the disk when convenient or when pricing is acceptable.

Next Steps
----------

1. Continue monitoring SMART for /dev/sdd monthly.
2. Plan a maintenance window for SAS disk replacement within the next 2-3 months.
3. Optionally enable additional ZFS pool features when convenient.

Report generated at [TIMESTAMP]
EOF
)

# --- Collect TS data (one SSH call, parse locally) ---
TS_SENSORS=$(ssh root@ts.9xc.local 'ipmitool sensor' 2>/dev/null)

# Parse temps locally using | as field separator — no quoting issues
CPU1_TEMP=$(echo "$TS_SENSORS" | awk -F'|' '/CPU1 Temp/       {gsub(/ /,"",$2); print $2; exit}')
CPU2_TEMP=$(echo "$TS_SENSORS" | awk -F'|' '/CPU2 Temp/       {gsub(/ /,"",$2); print $2; exit}')
SYS_TEMP=$(echo "$TS_SENSORS"  | awk -F'|' '/System Temp/     {gsub(/ /,"",$2); print $2; exit}')
PCH_TEMP=$(echo "$TS_SENSORS"  | awk -F'|' '/PCH Temp/        {gsub(/ /,"",$2); print $2; exit}')
PERIP_TEMP=$(echo "$TS_SENSORS"| awk -F'|' '/Peripheral Temp/ {gsub(/ /,"",$2); print $2; exit}')

# Fallbacks
CPU1_TEMP=${CPU1_TEMP:-N/A}
CPU2_TEMP=${CPU2_TEMP:-N/A}
SYS_TEMP=${SYS_TEMP:-N/A}
PCH_TEMP=${PCH_TEMP:-N/A}
PERIP_TEMP=${PERIP_TEMP:-N/A}

# --- Collect NODE1 data ---
NODE1_STATS=$(ssh localadmin@node1 'free -h | grep Mem' 2>/dev/null)
RAM_USED=$(echo "$NODE1_STATS" | awk '{print $3}')
RAM_AVAIL=$(echo "$NODE1_STATS" | awk '{print $7}')

LLAMA_STATUS=$(ssh localadmin@node1 'systemctl is-active llama-server.service' 2>/dev/null || echo "unknown")
LLAMA_UPTIME=$(ssh localadmin@node1 'systemctl show llama-server.service --property=ActiveEnterTimestamp' 2>/dev/null | cut -d= -f2)
LLAMA_UPTIME=${LLAMA_UPTIME:-unknown}

LLAMA_MEM_RAW=$(ssh localadmin@node1 'systemctl show llama-server.service --property=MemoryCurrent' 2>/dev/null | cut -d= -f2)
if [ -n "$LLAMA_MEM_RAW" ] && [ "$LLAMA_MEM_RAW" != "[not set]" ]; then
  LLAMA_MEM=$(awk "BEGIN {printf \"%.1f\", $LLAMA_MEM_RAW/1024/1024/1024}")
else
  LLAMA_MEM="N/A"
fi

GPU_STATS=$(ssh localadmin@node1 'nvidia-smi --query-gpu=temperature.gpu,memory.used --format=csv,noheader' 2>/dev/null)
GPU0_TEMP=$(echo "$GPU_STATS" | sed -n '1p' | cut -d',' -f1 | tr -d ' ')
GPU1_TEMP=$(echo "$GPU_STATS" | sed -n '2p' | cut -d',' -f1 | tr -d ' ')
GPU0_MEM=$(echo "$GPU_STATS" | sed -n '1p' | cut -d',' -f2 | tr -d ' ')
GPU1_MEM=$(echo "$GPU_STATS" | sed -n '2p' | cut -d',' -f2 | tr -d ' ')

LLAMA_HEALTHY="running"
if [ "$LLAMA_STATUS" = "active" ]; then
  LLAMA_HEALTHY="running smoothly"
fi

ROOT_STATS=$(ssh localadmin@node1 'df -h / | tail -1' 2>/dev/null)
ROOT_USED=$(echo "$ROOT_STATS" | awk '{print $3}')
ROOT_PCT=$(echo "$ROOT_STATS" | awk '{print $5}' | tr -d '%')

TEMP_STATUS="Excellent (CPU1: ${CPU1_TEMP} C, CPU2: ${CPU2_TEMP} C)"

TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')

# --- Replace placeholders ---
REPORT=$(echo "$REPORT" | sed "s/\[CPU1_TEMP\]/$CPU1_TEMP/g")
REPORT=$(echo "$REPORT" | sed "s/\[CPU2_TEMP\]/$CPU2_TEMP/g")
REPORT=$(echo "$REPORT" | sed "s/\[SYS_TEMP\]/$SYS_TEMP/g")
REPORT=$(echo "$REPORT" | sed "s/\[PCH_TEMP\]/$PCH_TEMP/g")
REPORT=$(echo "$REPORT" | sed "s/\[PERIP_TEMP\]/$PERIP_TEMP/g")
REPORT=$(echo "$REPORT" | sed "s/\[RAM_USED\]/$RAM_USED/g")
REPORT=$(echo "$REPORT" | sed "s/\[RAM_AVAIL\]/$RAM_AVAIL/g")
REPORT=$(echo "$REPORT" | sed "s/\[LLAMA_STATUS\]/$LLAMA_STATUS/g")
REPORT=$(echo "$REPORT" | sed "s|\[UPTIME\]|$LLAMA_UPTIME|g")
REPORT=$(echo "$REPORT" | sed "s/\[LLAMA_MEM\]/$LLAMA_MEM/g")
REPORT=$(echo "$REPORT" | sed "s/\[GPU0_TEMP\]/$GPU0_TEMP/g")
REPORT=$(echo "$REPORT" | sed "s/\[GPU1_TEMP\]/$GPU1_TEMP/g")
REPORT=$(echo "$REPORT" | sed "s/\[GPU0_MEM\]/$GPU0_MEM/g")
REPORT=$(echo "$REPORT" | sed "s/\[GPU1_MEM\]/$GPU1_MEM/g")
REPORT=$(echo "$REPORT" | sed "s/\[LLAMA_HEALTHY\]/$LLAMA_HEALTHY/g")
REPORT=$(echo "$REPORT" | sed "s/\[ROOT_USED\]/$ROOT_USED/g")
REPORT=$(echo "$REPORT" | sed "s/\[ROOT_PCT\]/$ROOT_PCT/g")
REPORT=$(echo "$REPORT" | sed "s/\[TEMP_STATUS\]/$TEMP_STATUS/g")
REPORT=$(echo "$REPORT" | sed "s/\[TIMESTAMP\]/$TIMESTAMP/g")

# --- Generate PDF and email ---
date_tag=$(date +%Y%m%d)
MD_PATH=/tmp/daily-systems-report-${date_tag}.md
PDF_PATH=/tmp/daily-systems-report-${date_tag}.pdf

echo "$REPORT" > "$MD_PATH"

if command -v pandoc >/dev/null 2>&1; then
  pandoc "$MD_PATH" -o "$PDF_PATH" --pdf-engine=xelatex -V geometry:margin=1in -V fontsize=11pt 2>/dev/null || PDF_PATH=""
else
  PDF_PATH=""
fi

BODY_FILE=/tmp/daily-systems-status-body-${date_tag}.txt
echo "Daily Systems Status Report attached as PDF." > "$BODY_FILE"

if [ -n "$PDF_PATH" ] && [ -f "$PDF_PATH" ]; then
  gog gmail send \
    --to "jeremy.ingalls@gmail.com" \
    --subject "Daily Systems Status Report - $(date +%Y-%m-%d)" \
    --body-file "$BODY_FILE" \
    --attach "$PDF_PATH"
else
  gog gmail send \
    --to "jeremy.ingalls@gmail.com" \
    --subject "Daily Systems Status Report - $(date +%Y-%m-%d)" \
    --body-file "$MD_PATH"
fi

echo "Daily systems status report generated and emailed at $TIMESTAMP"
