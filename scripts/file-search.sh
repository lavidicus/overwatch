#!/bin/bash
# File Search Script for OpenClaw Workspace
# Searches workspace files for relevant context

WORKSPACE="${WORKSPACE:-/home/localadmin/.openclaw/workspace}"
QUERY="${1:-$2}"
LIMIT="${2:-$3:-5}"

if [ -z "$QUERY" ]; then
    echo "Usage: $0 <query> [limit]"
    echo "Example: $0 \"database config\" 10"
    exit 1
fi

echo "🔍 Searching workspace for: \"$QUERY\""
echo "========================================"

# Search in memory files and key workspace files
find "$WORKSPACE" -type f \( -name "*.md" -o -name "*.json" -o -name "*.txt" \) \
    -not -path "*/node_modules/*" \
    -not -path "*/.git/*" \
    -exec grep -l -i "$QUERY" {} \; 2>/dev/null | head -n "$LIMIT" | while read -r file; do
    echo ""
    echo "📄 $file"
    echo "----------------------------------------"
    grep -i -A 3 -B 3 "$QUERY" "$file" 2>/dev/null | head -n 20
done

echo ""
echo "✅ Search complete"