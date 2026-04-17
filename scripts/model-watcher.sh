#!/bin/bash
# Model watcher: alerts if active model changes away from llama/llamacpp

LAST_FILE="/home/localadmin/.openclaw/workspace/tmp/last_model.txt"
CURRENT_MODEL=$(openclaw models 2>&1 | grep "^Default" | head -1)
NOW=$(date -u +"%Y-%m-%d %H:%M:%S UTC")

if [ -f "$LAST_FILE" ]; then
    LAST_MODEL=$(cat "$LAST_FILE")
else
    LAST_MODEL="unknown"
fi

echo "[$NOW] Current: $CURRENT_MODEL | Last: $LAST_MODEL" >> /home/localadmin/.openclaw/workspace/logs/model-watcher.log

if [[ "$CURRENT_MODEL" != *"$LAST_MODEL"* ]] && [[ "$LAST_MODEL" != "unknown" ]]; then
    echo "⚠️ MODEL SWITCH DETECTED: $LAST_MODEL -> $CURRENT_MODEL"
    # Send notification via matrix (adjust channel if needed)
    message "⚠️ Model switched from $LAST_MODEL to $CURRENT_MODEL"
    echo "⚠️ MODEL SWITCH DETECTED: $LAST_MODEL -> $CURRENT_MODEL" >> /home/localadmin/.openclaw/workspace/logs/model-watcher.log
fi

echo "$CURRENT_MODEL" > "$LAST_FILE"
