#!/bin/bash
# Monthly Vault Review Script
# Reviews monthly trends and updates learnings

VAULT_DIR="/home/localadmin/.openclaw/workspace/projects/obsidian-vault"
MONTH=$(date +%Y-%m)

# Create monthly review file
MONTHLY_FILE="$VAULT_DIR/03-Monthly/$MONTH-review.md"
if [ ! -f "$MONTHLY_FILE" ]; then
    echo "# Monthly Review: $MONTH" > "$MONTHLY_FILE"
    echo "" >> "$MONTHLY_FILE"
    echo "## Trends" >> "$MONTHLY_FILE"
    echo "" >> "$MONTHLY_FILE"
    echo "## Learnings" >> "$MONTHLY_FILE"
    echo "" >> "$MONTHLY_FILE"
    echo "## Recommendations" >> "$MONTHLY_FILE"
fi

echo "Monthly review created for $MONTH"
