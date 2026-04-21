#!/bin/bash
# Real-time Systems Dashboard - Updates every 30 seconds
# Targets: TS (Proxmox host) + Node2 (llama.cpp VM with 2x P6000)
# Runs on localhost:3000

set -euo pipefail

NODE_HOST="node2"
NODE_LABEL="NODE2"
NODE_IP="172.16.254.101"
NODE_CORES=28

collect_ts_data() {
    local sensors=$(ssh root@ts.9xc.local 'ipmitool sensor' 2>/dev/null || echo "")
    
    local cpu1_temp=$(echo "$sensors" | awk -F'|' '/CPU1 Temp/ {gsub(/ /,"",$2); print $2; exit}')
    local cpu2_temp=$(echo "$sensors" | awk -F'|' '/CPU2 Temp/ {gsub(/ /,"",$2); print $2; exit}')
    local sys_temp=$(echo "$sensors" | awk -F'|' '/System Temp/ {gsub(/ /,"",$2); print $2; exit}')
    local pch_temp=$(echo "$sensors" | awk -F'|' '/PCH Temp/ {gsub(/ /,"",$2); print $2; exit}')
    local perip_temp=$(echo "$sensors" | awk -F'|' '/Peripheral Temp/ {gsub(/ /,"",$2); print $2; exit}')
    
    local fan1=$(echo "$sensors" | awk -F'|' '/^FAN1 / {gsub(/ /,"",$2); print $2; exit}')
    local fan2=$(echo "$sensors" | awk -F'|' '/^FAN2 / {gsub(/ /,"",$2); print $2; exit}')
    local fan5=$(echo "$sensors" | awk -F'|' '/^FAN5 / {gsub(/ /,"",$2); print $2; exit}')
    
    echo "{\"cpu1\":\"${cpu1_temp:-N/A}\",\"cpu2\":\"${cpu2_temp:-N/A}\",\"sys\":\"${sys_temp:-N/A}\",\"pch\":\"${pch_temp:-N/A}\",\"perip\":\"${perip_temp:-N/A}\",\"fan1\":\"${fan1:-N/A}\",\"fan2\":\"${fan2:-N/A}\",\"fan5\":\"${fan5:-N/A}\"}"
}

collect_node2_data() {
    local mem=$(ssh localadmin@${NODE_HOST} 'free -h | grep Mem' 2>/dev/null || echo "")
    local ram_used=$(echo "$mem" | awk '{print $3}')
    local ram_avail=$(echo "$mem" | awk '{print $7}')
    
    local llama_status=$(ssh localadmin@${NODE_HOST} 'systemctl is-active llama-server.service' 2>/dev/null || echo "unknown")
    local llama_uptime=$(ssh localadmin@${NODE_HOST} 'systemctl show llama-server.service --property=ActiveEnterTimestamp' 2>/dev/null | cut -d= -f2)
    
    local llama_mem_raw=$(ssh localadmin@${NODE_HOST} 'systemctl show llama-server.service --property=MemoryCurrent' 2>/dev/null | cut -d= -f2)
    local llama_mem="N/A"
    if [ -n "$llama_mem_raw" ] && [ "$llama_mem_raw" != "[not set]" ] && [ "$llama_mem_raw" -gt 0 ] 2>/dev/null; then
        llama_mem=$(awk "BEGIN {printf \"%.1f\", $llama_mem_raw/1024/1024/1024}")
    fi
    
    local gpu_stats=$(ssh localadmin@${NODE_HOST} 'nvidia-smi --query-gpu=temperature.gpu,memory.used,memory.total,power.draw,power.limit --format=csv,noheader,nounits' 2>/dev/null || echo "")
    local gpu0_temp=$(echo "$gpu_stats" | sed -n '1p' | cut -d',' -f1 | tr -d ' ')
    local gpu1_temp=$(echo "$gpu_stats" | sed -n '2p' | cut -d',' -f1 | tr -d ' ')
    local gpu0_mem=$(echo "$gpu_stats" | sed -n '1p' | cut -d',' -f2 | tr -d ' ')
    local gpu1_mem=$(echo "$gpu_stats" | sed -n '2p' | cut -d',' -f2 | tr -d ' ')
    local gpu0_total=$(echo "$gpu_stats" | sed -n '1p' | cut -d',' -f3 | tr -d ' ')
    local gpu1_total=$(echo "$gpu_stats" | sed -n '2p' | cut -d',' -f3 | tr -d ' ')
    local gpu0_power=$(echo "$gpu_stats" | sed -n '1p' | cut -d',' -f4 | tr -d ' ')
    local gpu1_power=$(echo "$gpu_stats" | sed -n '2p' | cut -d',' -f4 | tr -d ' ')
    local gpu0_plimit=$(echo "$gpu_stats" | sed -n '1p' | cut -d',' -f5 | tr -d ' ')
    local gpu1_plimit=$(echo "$gpu_stats" | sed -n '2p' | cut -d',' -f5 | tr -d ' ')
    
    local total_power="N/A"
    local daily_kwh="N/A"
    local daily_cost="N/A"
    if [ "$gpu0_power" != "N/A" ] && [ "$gpu1_power" != "N/A" ]; then
        total_power=$(awk "BEGIN {printf \"%.1f\", $gpu0_power + $gpu1_power}")
        daily_kwh=$(awk "BEGIN {printf \"%.3f\", ($gpu0_power + $gpu1_power) * 24 / 1000}")
        daily_cost=$(awk "BEGIN {printf \"%.2f\", ($gpu0_power + $gpu1_power) * 24 / 1000 * 0.155}")
    fi
    
    local root_stats=$(ssh localadmin@${NODE_HOST} 'df -h / | tail -1' 2>/dev/null || echo "")
    local root_pct=$(echo "$root_stats" | awk '{print $5}' | tr -d '%')
    local root_used=$(echo "$root_stats" | awk '{print $3}')
    local root_total=$(echo "$root_stats" | awk '{print $2}')
    
    echo "{\"ram_used\":\"${ram_used:-N/A}\",\"ram_avail\":\"${ram_avail:-N/A}\",\"llama_status\":\"${llama_status}\",\"llama_uptime\":\"${llama_uptime:-unknown}\",\"llama_mem\":\"${llama_mem}\",\"gpu0_temp\":\"${gpu0_temp:-N/A}\",\"gpu1_temp\":\"${gpu1_temp:-N/A}\",\"gpu0_mem\":\"${gpu0_mem:-N/A}\",\"gpu1_mem\":\"${gpu1_mem:-N/A}\",\"gpu0_total\":\"${gpu0_total:-24576}\",\"gpu1_total\":\"${gpu1_total:-24576}\",\"gpu0_power\":\"${gpu0_power:-N/A}\",\"gpu1_power\":\"${gpu1_power:-N/A}\",\"gpu0_plimit\":\"${gpu0_plimit:-250.00}\",\"gpu1_plimit\":\"${gpu1_plimit:-250.00}\",\"total_power\":\"${total_power}\",\"daily_kwh\":\"${daily_kwh}\",\"daily_cost\":\"${daily_cost}\",\"root_pct\":\"${root_pct:-N/A}\",\"root_used\":\"${root_used:-N/A}\",\"root_total\":\"${root_total:-N/A}\"}"
}

# Main loop
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S UTC')
while true; do
    ts_data=$(collect_ts_data)
    node2_data=$(collect_node2_data)
    current_time=$(date -u '+%Y-%m-%dT%H:%M:%SZ')
    
    echo "{\"timestamp\": \"${current_time}\", \"ts\": ${ts_data}, \"node2\": ${node2_data}}"
    
    sleep 30
done
