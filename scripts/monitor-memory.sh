#!/bin/bash
# Memory Monitor - Checks MEMORY.md size and warns at 80% of 20k limit

MEMORY_FILE="/home/localadmin/.openclaw/workspace/MEMORY.md"
LIMIT=20000
WARNING_THRESHOLD=16000

size=$(wc -c < "$MEMORY_FILE" 2>/dev/null || echo 0)
percent=$((size * 100 / LIMIT))

echo "Memory size: ${size} bytes (${percent}% of ${LIMIT} limit)"

if [ "$size" -gt "$WARNING_THRESHOLD" ]; then
    echo "⚠️ WARNING: Memory is ${percent}% full (threshold: ${WARNING_THRESHOLD} bytes)"
    
    # Send Matrix notification
    if command -v node &> /dev/null; then
        node -e "
            const OpenClaw = require('openclaw');
            OpenClaw.message.send({
                channel: 'matrix',
                target: '@lavid:comms.9xc.io',
                message: \`📝 **Memory Warning**\nMEMORY.md is ${size} bytes (${percent}% of 20k limit)\nConsider trimming or archiving old entries.\`
            });
        " 2>/dev/null
    fi
fi
