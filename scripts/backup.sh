#!/usr/bin/env bash
# scripts/backup.sh
# Create a timestamped backup of critical config files

BACKUP_DIR="backups"
mkdir -p "$BACKUP_DIR"
TS=$(date -u +%Y%m%d%H%M%S)

cp ~/.openclaw/openclaw.json "$BACKUP_DIR/openclaw_${TS}.json"
cp -r ~/.openclaw/agents "$BACKUP_DIR/agents_${TS}"
cp -r ~/.openclaw/skills "$BACKUP_DIR/skills_${TS}"
cp ~/.openclaw/workspace/HEARTBEAT.md "$BACKUP_DIR/heartbeat_${TS}.md"

# Rotation: keep only last 7 backups
ls -1t "$BACKUP_DIR" | tail -n +8 | xargs -d '\n' rm -f

# Log
echo "[$(date -u +%F %T)Z] Backup ${TS} created." >> ~/.openclaw/workspace/memory/2026-02-27.md
