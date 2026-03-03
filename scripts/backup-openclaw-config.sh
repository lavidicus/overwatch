#!/bin/bash
# Daily OpenClaw config backup
# Pushes openclaw.json to GitHub with timestamp

set -e

WORKSPACE="$HOME/.openclaw/workspace"
CONFIG="$HOME/.openclaw/openclaw.json"
BACKUP_FILE="$WORKSPACE/backups/openclaw-backup.json"
TIMESTAMP=$(date '+%Y-%m-%d_%H:%M')

# Copy config to workspace
cp "$CONFIG" "$BACKUP_FILE"

# Git commit and push
cd "$WORKSPACE"
git add "backups/openclaw-backup.json"
git commit -m "backup: openclaw.json $TIMESTAMP"
git push origin main

echo "[$(date '+%Y-%m-%d %H:%M')] Backup pushed successfully"