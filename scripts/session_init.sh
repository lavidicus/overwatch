#!/usr/bin/env bash
# /home/localadmin/.openclaw/workspace/scripts/session_init.sh
# This script runs at the start of each OpenClaw session.
# It loads the core files (SOUL.md, USER.md, IDENTITY.md) and
# ensures a per‑day memory file exists. The paths are exported
# as environment variables so that the agent or any tool can
# reference them without re‑reading the files.

set -euo pipefail

BASE="$(dirname "$(readlink -f "$0")")/.."
SOUL="$BASE/SOUL.md"
USER="$BASE/USER.md"
IDENTITY="$BASE/IDENTITY.md"
MEMORY_DIR="$BASE/memory"
mkdir -p "$MEMORY_DIR"
MEMORY_FILE="$MEMORY_DIR/$(date +%F).md"

# Verify required files exist
for f in "$SOUL" "$USER" "$IDENTITY"; do
  if [[ ! -f "$f" ]]; then
    echo "Missing required file: $f" >&2
    exit 1
  fi
done

# Create the daily memory file if it does not yet exist
: > "$MEMORY_FILE"

# Export paths so tools can use them directly
export SESSION_SOUL="$SOUL"
export SESSION_USER="$USER"
export SESSION_IDENTITY="$IDENTITY"
export SESSION_MEMORY_FILE="$MEMORY_FILE"

# Log start marker in memory file
printf "=== Session started %s ===\n" "$(date -u +%FT%TZ)" >> "$MEMORY_FILE"

# Inform OpenClaw that the hook succeeded
exit 0
