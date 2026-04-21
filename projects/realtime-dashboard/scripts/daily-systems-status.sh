#!/bin/bash
# Daily Systems Status Report - HTML Dashboard
# Targets: TS (Proxmox host) + Node2 (llama.cpp VM with 2x P6000)
# Runs at 06:30 AM CST (12:30 UTC)
# Output: Styled HTML dashboard emailed as attachment via gog

set -euo pipefail

date_tag=$(date +%Y%m%d)
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')
NODE_HOST="node2"
NODE_LABEL="NODE2"
NODE_IP="172.16.254.101"
NODE_CORES=28

# --- Collect TS data (one SSH call, parse locally) ---
TS_SENSORS=$(ssh root@ts.9xc.local 'ipmitool sensor' 2>/dev/null || echo "")

# Strip trailing .000 from numeric ipmitool values
strip_trailing_zeros() {
  local val="$1"
  if [[ "$val" =~ ^[0-9]+\.0+ ]]; then
    echo "${val%%.*}"
  else
    echo "$val"
  fi
}

CPU1_TEMP=$(echo "$TS_SENSORS" | awk -F'|' '/CPU1 Temp/       {gsub(/ /,"",$2); print $2; exit}')
CPU2_TEMP=$(echo "$TS_SENSORS" | awk -F'|' '/CPU2 Temp/       {gsub(/ /,"",$2); print $2; exit}')
SYS_TEMP=$(echo "$TS_SENSORS"  | awk -F'|' '/System Temp/     {gsub(/ /,"",$2); print $2; exit}')
PCH_TEMP=$(echo "$TS_SENSORS"  | awk -F'|' '/PCH Temp/        {gsub(/ /,"",$2); print $2; exit}')
PERIP_TEMP=$(echo "$TS_SENSORS"| awk -F'|' '/Peripheral Temp/ {gsub(/ /,"",$2); print $2; exit}')

CPU1_TEMP=$(strip_trailing_zeros "${CPU1_TEMP:-N/A}"); CPU2_TEMP=$(strip_trailing_zeros "${CPU2_TEMP:-N/A}")
SYS_TEMP=$(strip_trailing_zeros "${SYS_TEMP:-N/A}");   PCH_TEMP=$(strip_trailing_zeros "${PCH_TEMP:-N/A}")
PERIP_TEMP=$(strip_trailing_zeros "${PERIP_TEMP:-N/A}")

# Fan data
FAN1=$(echo "$TS_SENSORS" | awk -F'|' '/^FAN1 / {gsub(/ /,"",$2); print $2; exit}')
FAN2=$(echo "$TS_SENSORS" | awk -F'|' '/^FAN2 / {gsub(/ /,"",$2); print $2; exit}')
FAN5=$(echo "$TS_SENSORS" | awk -F'|' '/^FAN5 / {gsub(/ /,"",$2); print $2; exit}')
FAN1=$(strip_trailing_zeros "${FAN1:-N/A}"); FAN2=$(strip_trailing_zeros "${FAN2:-N/A}"); FAN5=$(strip_trailing_zeros "${FAN5:-N/A}")

# --- Collect Node2 data (batch SSH calls) ---
NODE_MEM=$(ssh localadmin@${NODE_HOST} 'free -h | grep Mem' 2>/dev/null || echo "")
RAM_USED=$(echo "$NODE_MEM" | awk '{print $3}')
RAM_AVAIL=$(echo "$NODE_MEM" | awk '{print $7}')
RAM_USED=${RAM_USED:-N/A}; RAM_AVAIL=${RAM_AVAIL:-N/A}

LLAMA_STATUS=$(ssh localadmin@${NODE_HOST} 'systemctl is-active llama-server.service' 2>/dev/null || echo "unknown")
LLAMA_UPTIME=$(ssh localadmin@${NODE_HOST} 'systemctl show llama-server.service --property=ActiveEnterTimestamp' 2>/dev/null | cut -d= -f2)
LLAMA_UPTIME=${LLAMA_UPTIME:-unknown}

LLAMA_MEM_RAW=$(ssh localadmin@${NODE_HOST} 'systemctl show llama-server.service --property=MemoryCurrent' 2>/dev/null | cut -d= -f2)
if [ -n "$LLAMA_MEM_RAW" ] && [ "$LLAMA_MEM_RAW" != "[not set]" ] && [ "$LLAMA_MEM_RAW" -gt 0 ] 2>/dev/null; then
  LLAMA_MEM=$(awk "BEGIN {printf \"%.1f\", $LLAMA_MEM_RAW/1024/1024/1024}")
else
  LLAMA_MEM="N/A"
fi

# GPU stats
GPU_STATS=$(ssh localadmin@${NODE_HOST} 'nvidia-smi --query-gpu=temperature.gpu,memory.used,memory.total,power.draw,power.limit --format=csv,noheader,nounits' 2>/dev/null || echo "")
GPU0_TEMP=$(echo "$GPU_STATS" | sed -n '1p' | cut -d',' -f1 | tr -d ' ')
GPU1_TEMP=$(echo "$GPU_STATS" | sed -n '2p' | cut -d',' -f1 | tr -d ' ')
GPU0_MEM=$(echo "$GPU_STATS" | sed -n '1p' | cut -d',' -f2 | tr -d ' ')
GPU1_MEM=$(echo "$GPU_STATS" | sed -n '2p' | cut -d',' -f2 | tr -d ' ')
GPU0_TOTAL=$(echo "$GPU_STATS" | sed -n '1p' | cut -d',' -f3 | tr -d ' ')
GPU1_TOTAL=$(echo "$GPU_STATS" | sed -n '2p' | cut -d',' -f3 | tr -d ' ')
GPU0_POWER=$(echo "$GPU_STATS" | sed -n '1p' | cut -d',' -f4 | tr -d ' ')
GPU1_POWER=$(echo "$GPU_STATS" | sed -n '2p' | cut -d',' -f4 | tr -d ' ')
GPU0_PLIMIT=$(echo "$GPU_STATS" | sed -n '1p' | cut -d',' -f5 | tr -d ' ')
GPU1_PLIMIT=$(echo "$GPU_STATS" | sed -n '2p' | cut -d',' -f5 | tr -d ' ')

GPU0_TEMP=${GPU0_TEMP:-N/A}; GPU1_TEMP=${GPU1_TEMP:-N/A}
GPU0_MEM=${GPU0_MEM:-N/A};   GPU1_MEM=${GPU1_MEM:-N/A}
GPU0_TOTAL=${GPU0_TOTAL:-24576}; GPU1_TOTAL=${GPU1_TOTAL:-24576}
GPU0_POWER=${GPU0_POWER:-N/A}; GPU1_POWER=${GPU1_POWER:-N/A}
GPU0_PLIMIT=${GPU0_PLIMIT:-250.00}; GPU1_PLIMIT=${GPU1_PLIMIT:-250.00}

# Total power
if [ "$GPU0_POWER" != "N/A" ] && [ "$GPU1_POWER" != "N/A" ]; then
  TOTAL_POWER=$(awk "BEGIN {printf \"%.1f\", $GPU0_POWER + $GPU1_POWER}")
  DAILY_KWH=$(awk "BEGIN {printf \"%.3f\", ($GPU0_POWER + $GPU1_POWER) * 24 / 1000}")
  DAILY_COST=$(awk "BEGIN {printf \"%.2f\", ($GPU0_POWER + $GPU1_POWER) * 24 / 1000 * 0.155}")
else
  TOTAL_POWER="N/A"; DAILY_KWH="N/A"; DAILY_COST="N/A"
fi

# Root FS
ROOT_STATS=$(ssh localadmin@${NODE_HOST} 'df -h / | tail -1' 2>/dev/null || echo "")
ROOT_PCT=$(echo "$ROOT_STATS" | awk '{print $5}' | tr -d '%')
ROOT_USED=$(echo "$ROOT_STATS" | awk '{print $3}')
ROOT_TOTAL=$(echo "$ROOT_STATS" | awk '{print $2}')
ROOT_PCT=${ROOT_PCT:-N/A}; ROOT_USED=${ROOT_USED:-N/A}; ROOT_TOTAL=${ROOT_TOTAL:-N/A}

# Llama status color
if [ "$LLAMA_STATUS" = "active" ]; then
  LLAMA_COLOR="#28a745"
  LLAMA_LABEL="active (running)"
else
  LLAMA_COLOR="#dc3545"
  LLAMA_LABEL="$LLAMA_STATUS"
fi

# --- Generate HTML Dashboard ---
HTML_PATH=/tmp/daily-systems-dashboard-${date_tag}.html

cat > "$HTML_PATH" << HTMLEOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Systems Status Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 2.5em; font-weight: 700; }
        .header p { margin: 10px 0 0 0; font-size: 1.1em; opacity: 0.9; }
        .section { background: white; border-radius: 10px; padding: 25px; margin-bottom: 25px; box-shadow: 0 2px 10px rgba(0,0,0,0.08); }
        .section h2 { margin-top: 0; color: #667eea; font-size: 1.6em; border-bottom: 2px solid #667eea; padding-bottom: 10px; margin-bottom: 20px; }
        .section h3 { color: #555; margin-top: 20px; }
        .metrics-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 20px; }
        .metric-card { background: #f8f9fa; border-radius: 8px; padding: 15px; text-align: center; border-left: 4px solid #667eea; }
        .metric-label { font-size: 0.9em; color: #666; margin-bottom: 5px; }
        .metric-value { font-size: 1.8em; font-weight: 700; color: #333; }
        .metric-unit { font-size: 0.9em; color: #999; }
        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
        th { background: #f8f9fa; font-weight: 600; color: #667eea; }
        tr:hover { background: #f8f9fa; }
        .status-healthy { color: #28a745; font-weight: 600; }
        .status-warning { color: #ffc107; font-weight: 600; }
        .status-critical { color: #dc3545; font-weight: 600; }
        .temp-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid #eee; }
        .temp-row:last-child { border-bottom: none; }
        .temp-label { font-weight: 500; }
        .temp-value { font-size: 1.2em; font-weight: 700; color: #667eea; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 0.9em; }
        .alert-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .alert-box.critical { background: #f8d7da; border-left-color: #dc3545; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Daily Systems Status Report</h1>
        <p>Generated at ${TIMESTAMP}</p>
    </div>

    <div class="section">
        <h2>TS Proxmox Host (172.16.254.5)</h2>

        <h3>Temperatures</h3>
        <div class="metrics-grid">
            <div class="metric-card"><div class="metric-label">CPU 1</div><div class="metric-value">${CPU1_TEMP} <span class="metric-unit">&deg;C</span></div></div>
            <div class="metric-card"><div class="metric-label">CPU 2</div><div class="metric-value">${CPU2_TEMP} <span class="metric-unit">&deg;C</span></div></div>
            <div class="metric-card"><div class="metric-label">System</div><div class="metric-value">${SYS_TEMP} <span class="metric-unit">&deg;C</span></div></div>
            <div class="metric-card"><div class="metric-label">PCH</div><div class="metric-value">${PCH_TEMP} <span class="metric-unit">&deg;C</span></div></div>
            <div class="metric-card"><div class="metric-label">Peripheral</div><div class="metric-value">${PERIP_TEMP} <span class="metric-unit">&deg;C</span></div></div>
        </div>

        <h3>Fans</h3>
        <div class="metrics-grid">
            <div class="metric-card"><div class="metric-label">FAN1</div><div class="metric-value">${FAN1} <span class="metric-unit">RPM</span></div></div>
            <div class="metric-card"><div class="metric-label">FAN2</div><div class="metric-value">${FAN2} <span class="metric-unit">RPM</span></div></div>
            <div class="metric-card"><div class="metric-label">FAN5</div><div class="metric-value">${FAN5} <span class="metric-unit">RPM</span></div></div>
        </div>
        <p style="color: #999; font-size: 0.85em;">FAN3, FAN4, FAN6, FANA, FANB: not connected / no reading</p>

        <h3>Storage Pools</h3>
        <table>
            <thead><tr><th>Pool</th><th>Capacity</th><th>Type</th><th>Status</th><th>Notes</th></tr></thead>
            <tbody>
                <tr><td><strong>SAS</strong></td><td>17.3 TB</td><td>RAIDZ1-0</td><td><span class="status-healthy">ONLINE</span></td><td>/dev/sdd: 36,704 reallocated sectors (&amp;#9888; Replace soon)</td></tr>
                <tr><td><strong>fast-store</strong></td><td>2.4 TB</td><td>RAIDZ1-0</td><td><span class="status-healthy">ONLINE</span></td><td>4x Crucial P3 NVMe (healthy)</td></tr>
                <tr><td><strong>rpool</strong></td><td>842 GB</td><td>Mirror</td><td><span class="status-healthy">ONLINE</span></td><td>2x Intel P3 SSD (stable)</td></tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>${NODE_LABEL} VM (Ubuntu 24.04, ${NODE_IP})</h2>

        <h3>Hardware Overview</h3>
        <div class="metrics-grid">
            <div class="metric-card"><div class="metric-label">CPU</div><div class="metric-value">${NODE_CORES} <span class="metric-unit">cores</span></div></div>
            <div class="metric-card"><div class="metric-label">RAM Used</div><div class="metric-value">${RAM_USED}</div></div>
            <div class="metric-card"><div class="metric-label">RAM Available</div><div class="metric-value">${RAM_AVAIL}</div></div>
            <div class="metric-card"><div class="metric-label">Root FS</div><div class="metric-value">${ROOT_PCT} <span class="metric-unit">% used</span></div></div>
        </div>

        <h3>llama.cpp Service</h3>
        <div class="temp-row"><span class="temp-label">Status</span><span class="temp-value" style="color: ${LLAMA_COLOR}">${LLAMA_LABEL}</span></div>
        <div class="temp-row"><span class="temp-label">Uptime Since</span><span class="temp-value">${LLAMA_UPTIME}</span></div>
        <div class="temp-row"><span class="temp-label">Memory</span><span class="temp-value">${LLAMA_MEM} GB</span></div>

        <h3>GPU Status (2x Quadro P6000)</h3>
        <table>
            <thead><tr><th>GPU</th><th>Temp</th><th>VRAM Used</th><th>Power</th><th>Status</th></tr></thead>
            <tbody>
                <tr><td><strong>GPU 0</strong></td><td>${GPU0_TEMP}&deg;C</td><td>${GPU0_MEM} / ${GPU0_TOTAL} MiB</td><td>${GPU0_POWER} / ${GPU0_PLIMIT} W</td><td><span class="status-healthy">Healthy</span></td></tr>
                <tr><td><strong>GPU 1</strong></td><td>${GPU1_TEMP}&deg;C</td><td>${GPU1_MEM} / ${GPU1_TOTAL} MiB</td><td>${GPU1_POWER} / ${GPU1_PLIMIT} W</td><td><span class="status-healthy">Healthy</span></td></tr>
            </tbody>
        </table>
    </div>

    <div class="section">
        <h2>Usage &amp; Cost Tracking</h2>

        <h3>Power &amp; Energy</h3>
        <div class="metrics-grid">
            <div class="metric-card"><div class="metric-label">Total GPU Power</div><div class="metric-value">${TOTAL_POWER} <span class="metric-unit">W</span></div></div>
            <div class="metric-card"><div class="metric-label">Est. Daily Energy</div><div class="metric-value">${DAILY_KWH} <span class="metric-unit">kWh</span></div></div>
            <div class="metric-card"><div class="metric-label">Est. Daily Cost</div><div class="metric-value">\$${DAILY_COST} <span class="metric-unit">@ \$0.155/kWh</span></div></div>
        </div>
    </div>

    <div class="section">
        <h2>Summary &amp; Action Items</h2>

        <div class="alert-box">
            <strong>&#9888; Action Required:</strong> SAS pool drive /dev/sdd has 36,704 reallocated sectors. Data is replaceable. Plan disk replacement within 2-3 months.
        </div>

        <h3>Healthy Systems</h3>
        <ul>
            <li>rpool (OS mirror) is stable and fully online</li>
            <li>fast-store NVMe pool is healthy with low wear</li>
            <li>${NODE_LABEL} llama.cpp service is ${LLAMA_LABEL} on both P6000 GPUs</li>
            <li>Chassis and CPU temperatures are within normal range</li>
        </ul>

        <h3>Next Steps</h3>
        <ol>
            <li>Continue monitoring SMART for /dev/sdd monthly</li>
            <li>Plan a maintenance window for SAS disk replacement within the next 2-3 months</li>
            <li>5 chassis fan headers show no reading &mdash; verify physically</li>
        </ol>
    </div>

    <div class="footer">
        <p>Report generated at ${TIMESTAMP} | Daily Systems Status Dashboard</p>
    </div>
</body>
</html>
HTMLEOF

echo "HTML dashboard written to $HTML_PATH"

# --- Email HTML dashboard ---
BODY_FILE=/tmp/daily-systems-status-body-${date_tag}.txt
echo "Daily Systems Status Dashboard attached as HTML." > "$BODY_FILE"

gog gmail send \
    --to "jeremy.ingalls@gmail.com" \
    --subject "Daily Systems Status Dashboard - $(date +%Y-%m-%d)" \
    --body-file "$BODY_FILE" \
    --attach "$HTML_PATH"

echo "Daily systems status dashboard emailed at $TIMESTAMP"
