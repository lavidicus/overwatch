#!/usr/bin/env bash
# scripts/healthcheck.sh

# Basic health metrics
GATEWAY_STATUS=$(openclaw gateway status)
DISK_USAGE=$(df -h / | awk 'NR==2{print $5}')
MEM_USAGE=$(free -m | awk 'NR==2{print $3}')

MSG="
OpenClaw Health Check – $(date -u +%F %T)Z

Gateway: ${GATEWAY_STATUS}
Disk usage: ${DISK_USAGE}
Memory usage: ${MEM_USAGE}MB
"

# Send to Signal (assuming account is configured)
openclaw message send --to +13184061402 "$MSG"
