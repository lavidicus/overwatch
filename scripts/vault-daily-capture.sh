#!/bin/bash
# Daily Vault Capture Script
# Captures daily notes from memory/ directory to Obsidian vault

VAULT_DIR="/home/localadmin/.openclaw/workspace/projects/obsidian-vault/01-Daily"
MEMORY_DIR="/home/localadmin/.openclaw/workspace/memory"
TODAY=$(date +%Y-%m-%d)

# Ensure vault directories exist
mkdir -p "$VAULT_DIR"

# Create daily note if it doesn't exist
if [ ! -f "$VAULT_DIR/$TODAY.md" ]; then
    echo "# Daily Note: $TODAY" > "$VAULT_DIR/$TODAY.md"
    echo "" >> "$VAULT_DIR/$TODAY.md"
    echo "## Key Events" >> "$VAULT_DIR/$TODAY.md"
    echo "" >> "$VAULT_DIR/$TODAY.md"
    echo "## Insights" >> "$VAULT_DIR/$TODAY.md"
    echo "" >> "$VAULT_DIR/$TODAY.md"
    echo "## Learnings" >> "$VAULT_DIR/$TODAY.md"
fi

# Copy today's memory file if it exists
if [ -f "$MEMORY_DIR/$TODAY.md" ]; then
    cp "$MEMORY_DIR/$TODAY.md" "$VAULT_DIR/$TODAY.md"
fi

echo "Daily vault capture completed for $TODAY"
