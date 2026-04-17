#!/bin/bash
# Ensure NVIDIA persistence mode is enabled on both GPUs
# Called by systemd service at boot

LOG_FILE="/var/log/node2-persistence.log"
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Checking/enabling NVIDIA persistence mode" >> "$LOG_FILE"

# Enable persistence mode on all GPUs
sudo nvidia-smi -pm 1 >> "$LOG_FILE" 2>&1
RESULT=$?

if [ $RESULT -eq 0 ]; then
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Persistence mode enabled successfully" >> "$LOG_FILE"
else
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - FAILED to enable persistence mode (exit code: $RESULT)" >> "$LOG_FILE"
fi

# Verify status
echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) - Current status:" >> "$LOG_FILE"
nvidia-smi -q | grep -A 1 "Persistence Mode" >> "$LOG_FILE" 2>&1
