#!/bin/bash
# Memory Loader - Loads memory/ files for session bootstrap

set -euo pipefail

WORKSPACE="/home/localadmin/.openclaw/workspace"
MEMORY_DIR="$WORKSPACE/memory"
MEMORY_MD="$WORKSPACE/MEMMARY.md"
TODAY=$(date +%Y-%m-%d)

# Function to load memory file
load_memory() {
    local file=$1
    if [ -f "$file" ]; then
        echo "=== LOADING: $file ==="
        cat "$file"
        echo ""
    fi
}

# Function to load recent memory files (last N days)
load_recent() {
    local days=$1
    local count=0
    
    echo "=== LOADING RECENT MEMORY (last $days days) ==="
    
    while [ $count -lt $days ]; do
        local date_str=$(date -d "$count days ago" +%Y-%m-%d 2>/dev/null || \
                         date -v-${count}d +%Y-%m-%d 2>/dev/null || \
                         echo "")
        
        if [ -n "$date_str" ]; then
            local file="$MEMORY_DIR/${date_str}.md"
            if [ -f "$file" ]; then
                load_memory "$file"
                ((count++))
            fi
        fi
    done
}

# Main loading sequence
echo "# MEMORY LOADING START"
echo "# Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo ""

# 1. Load MEMORY.md (curated, always relevant)
if [ -f "$MEMORY_MD" ]; then
    echo "=== MEMORY.md (Curated Long-Term Memory) ==="
    cat "$MEMORY_MD"
    echo ""
fi

# 2. Load today's memory file
if [ -f "$MEMORY_DIR/${TODAY}.md" ]; then
    echo "=== memory/${TODAY}.md (Today's Session Log) ==="
    cat "$MEMORY_DIR/${TODAY}.md"
    echo ""
fi

# 3. Load recent memory files (last 7 days)
load_recent 7

# 4. Load memory index for cross-references
if [ -f "$MEMORY_DIR/MEMORY_INDEX.md" ]; then
    echo "=== memory/MEMORY_INDEX.md (Memory Cross-Reference) ==="
    cat "$MEMORY_DIR/MEMORY_INDEX.md"
    echo ""
fi

echo "# MEMORY LOADING END"
