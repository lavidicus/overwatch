#!/usr/bin/env bash
# sync-libraries.sh — Sync /SAS/Library on TS to match /mas/Library on MAS
# Usage: bash sync-libraries.sh [--step 1|2|3|4|5] [--resume]
#
# Step 1: Scan both libraries, produce normalized index files
# Step 2: Find name mismatches (same content, different names)
# Step 3: Rename TS files to match MAS names
# Step 4: Find files on MAS not on TS
# Step 5: rsync missing files from MAS to TS (pause/resume capable)

set -euo pipefail

TS_HOST="root@ts"
MAS_HOST="root@mas"
MAS_DIR="/mas/Library"
TS_DIR="/SAS/Library"

WORKDIR="/tmp/lib-sync"
mkdir -p "$WORKDIR"

STEP="${1:-all}"
RESUME="${2:-no}"

# ─── Step 1: Scan both libraries ───────────────────────────────────────
scan_library() {
    local host="$1"
    local dir="$2"
    local out="$3"
    # List all directories (skip top-level), output relative paths
    ssh -o BatchMode=yes -o ConnectTimeout=5 "$host" \
        "find '$dir' -mindepth 1 -maxdepth 1 -type d -printf '%f\n' 2>/dev/null | sort" > "$out"
}

# ─── Step 2: Find name mismatches ──────────────────────────────────────
# Normalize: lowercase, replace S01/Season 01/S01E01/Season 01 Episode 01, etc.
normalize() {
    echo "$1" | \
        sed -E 's/^(.+)[[:space:]]+\([0-9]{4}\)/\1 \2/i' | \
        tr '[:upper:]' '[:lower:]' | \
        sed -E 's/season[[:space:]]*([0-9]+)/S\1/g' | \
        sed -E 's/episode[[:space:]]*([0-9]+)/E\1/g' | \
        sed -E 's/\([[:space:]]*\)/ /g' | \
        sed -E 's/[[:space:]]+/ /g' | \
        sed -E 's/[[:space:]]+$//' | \
        sed -E 's/^-//;s/-$//'
}

echo "=== Library Sync Tool ==="
echo "MAS:  $MAS_HOST:$MAS_DIR"
echo "TS:   $TS_HOST:$TS_DIR"
echo ""

if [[ "$STEP" == "all" || "$STEP" == "1" ]]; then
    echo "Step 1: Scanning libraries..."
    scan_library "$MAS_HOST" "$MAS_DIR" "$WORKDIR/mas_dirs.txt"
    scan_library "$TS_HOST" "$TS_DIR" "$WORKDIR/ts_dirs.txt"
    MAS_COUNT=$(wc -l < "$WORKDIR/mas_dirs.txt")
    TS_COUNT=$(wc -l < "$WORKDIR/ts_dirs.txt")
    echo "  MAS directories: $MAS_COUNT"
    echo "  TS directories:  $TS_COUNT"
    echo "  Done. Index files saved to $WORKDIR/"
fi

if [[ "$STEP" == "all" || "$STEP" == "2" ]]; then
    echo "Step 2: Finding name mismatches..."
    # Build normalized maps
    ssh -o BatchMode=yes -o ConnectTimeout=5 "$MAS_HOST" \
        "find '$MAS_DIR' -mindepth 2 -maxdepth 2 -type d -printf '%f\n' 2>/dev/null" | \
    while IFS= read -r dir; do
        norm=$(echo "$dir" | tr '[:upper:]' '[:lower:]' | sed -E 's/season[[:space:]]*([0-9]+)/S\1/g' | sed -E 's/episode[[:space:]]*([0-9]+)/E\1/g' | sed -E 's/\([[:space:]]*\)/ /g' | sed -E 's/[[:space:]]+/ /g' | sed -E 's/^-//;s/-$//')
        echo "$norm|$dir"
    done | sort > "$WORKDIR/mas_normalized.txt"

    ssh -o BatchMode=yes -o ConnectTimeout=5 "$TS_HOST" \
        "find '$TS_DIR' -mindepth 2 -maxdepth 2 -type d -printf '%f\n' 2>/dev/null" | \
    while IFS= read -r dir; do
        norm=$(echo "$dir" | tr '[:upper:]' '[:lower:]' | sed -E 's/season[[:space:]]*([0-9]+)/S\1/g' | sed -E 's/episode[[:space:]]*([0-9]+)/E\1/g' | sed -E 's/\([[:space:]]*\)/ /g' | sed -E 's/[[:space:]]+/ /g' | sed -E 's/^-//;s/-$//')
        echo "$norm|$dir"
    done | sort > "$WORKDIR/ts_normalized.txt"

    # Find matches (same normalized name, different original)
    comm -12 "$WORKDIR/mas_normalized.txt" "$WORKDIR/ts_normalized.txt" | while IFS='|' read -r norm mas_name; do
        ts_name=$(grep "^${norm}|" "$WORKDIR/ts_normalized.txt" | head -1 | cut -d'|' -f2)
        if [[ "$mas_name" != "$ts_name" ]]; then
            echo "MISMATCH: MAS='$mas_name'  TS='$ts_name'  (normalized: $norm)"
        fi
    done > "$WORKDIR/mismatches.txt"

    MISMATCH_COUNT=$(wc -l < "$WORKDIR/mismatches.txt")
    echo "  Found $MISMATCH_COUNT name mismatches."
    echo "  Full list: $WORKDIR/mismatches.txt"
    if [[ "$MISMATCH_COUNT" -gt 0 ]]; then
        echo ""
        echo "  First 20 mismatches:"
        head -20 "$WORKDIR/mismatches.txt"
    fi
fi

if [[ "$STEP" == "all" || "$STEP" == "3" ]]; then
    echo "Step 3: Renaming TS directories to match MAS..."
    RENAME_COUNT=0
    while IFS='|' read -r norm mas_name; do
        ts_name=$(grep "^${norm}|" "$WORKDIR/ts_normalized.txt" | head -1 | cut -d'|' -f2)
        if [[ "$mas_name" != "$ts_name" ]]; then
            # Check if target already exists
            if ssh -o BatchMode=yes -o ConnectTimeout=5 "$TS_HOST" \
                "[[ -d '$TS_DIR/$mas_name' ]]" 2>/dev/null; then
                echo "  SKIP: '$mas_name' already exists on TS"
                continue
            fi
            echo "  Rename: '$ts_name' → '$mas_name'"
            ssh -o BatchMode=yes -o ConnectTimeout=5 "$TS_HOST" \
                "mv '$TS_DIR/$ts_name' '$TS_DIR/$mas_name'" 2>/dev/null && \
                RENAME_COUNT=$((RENAME_COUNT + 1)) || \
                echo "  ERROR: Failed to rename '$ts_name'"
        fi
    done < "$WORKDIR/mismatches.txt"
    echo "  Renamed $RENAME_COUNT directories."
fi

if [[ "$STEP" == "all" || "$STEP" == "4" ]]; then
    echo "Step 4: Finding files on MAS not on TS..."
    # Get normalized MAS dir names
    ssh -o BatchMode=yes -o ConnectTimeout=5 "$MAS_HOST" \
        "find '$MAS_DIR' -mindepth 2 -maxdepth 2 -type d -printf '%f\n' 2>/dev/null" | \
    while IFS= read -r dir; do
        norm=$(echo "$dir" | tr '[:upper:]' '[:lower:]' | sed -E 's/season[[:space:]]*([0-9]+)/S\1/g' | sed -E 's/episode[[:space:]]*([0-9]+)/E\1/g' | sed -E 's/\([[:space:]]*\)/ /g' | sed -E 's/[[:space:]]+/ /g' | sed -E 's/^-//;s/-$//')
        echo "$norm|$dir"
    done | sort > "$WORKDIR/mas_norm_full.txt"

    ssh -o BatchMode=yes -o ConnectTimeout=5 "$TS_HOST" \
        "find '$TS_DIR' -mindepth 2 -maxdepth 2 -type d -printf '%f\n' 2>/dev/null" | \
    while IFS= read -r dir; do
        norm=$(echo "$dir" | tr '[:upper:]' '[:lower:]' | sed -E 's/season[[:space:]]*([0-9]+)/S\1/g' | sed -E 's/episode[[:space:]]*([0-9+)/E\1/g' | sed -E 's/\([[:space:]]*\)/ /g' | sed -E 's/[[:space:]]+/ /g' | sed -E 's/^-//;s/-$//')
        echo "$norm|$dir"
    done | sort > "$WORKDIR/ts_norm_full.txt"

    # Find MAS dirs with no TS match
    comm -23 "$WORKDIR/mas_norm_full.txt" "$WORKDIR/ts_norm_full.txt" | while IFS='|' read -r norm mas_dir; do
        echo "MISSING: MAS='$mas_dir' (normalized: $norm)"
    done > "$WORKDIR/missing.txt"

    MISSING_COUNT=$(wc -l < "$WORKDIR/missing.txt")
    echo "  Found $MISSING_COUNT directories on MAS not on TS."
    echo "  Full list: $WORKDIR/missing.txt"
    if [[ "$MISSING_COUNT" -gt 0 ]]; then
        echo ""
        echo "  First 20 missing:"
        head -20 "$WORKDIR/missing.txt"
    fi
fi

if [[ "$STEP" == "all" || "$STEP" == "5" ]]; then
    echo "Step 5: Syncing missing files from MAS to TS..."
    echo "  Using rsync with --partial (pause/resume capable)"
    echo "  To pause: Ctrl+C"
    echo "  To resume: run this script again — it will continue where it left off"
    echo ""

    # Build rsync list from missing.txt
    while IFS='|' read -r norm mas_dir; do
        echo "$mas_dir"
    done < "$WORKDIR/missing.txt" > "$WORKDIR/missing_dirs.txt"

    # rsync each missing directory
    while IFS= read -r mas_rel_dir; do
        MAS_PATH="$MAS_DIR/$mas_rel_dir"
        # Find normalized TS path
        norm=$(echo "$mas_rel_dir" | tr '[:upper:]' '[:lower:]' | sed -E 's/season[[:space:]]*([0-9]+)/S\1/g' | sed -E 's/episode[[:space:]]*([0-9]+)/E\1/g' | sed -E 's/\([[:space:]]*\)/ /g' | sed -E 's/[[:space:]]+/ /g' | sed -E 's/^-//;s/-$//')
        TS_REL_DIR=$(grep "^${norm}|" "$WORKDIR/ts_norm_full.txt" 2>/dev/null | head -1 | cut -d'|' -f2)
        if [[ -z "$TS_REL_DIR" ]]; then
            TS_REL_DIR="$mas_rel_dir"
        fi
        TS_PATH="$TS_DIR/$TS_REL_DIR"

        echo "  Syncing: $mas_rel_dir → $TS_REL_DIR"
        ssh -o BatchMode=yes -o ConnectTimeout=5 "$MAS_HOST" \
            "rsync -av --partial --progress --human-readable \
                '$MAS_PATH/' root@ts:'$TS_PATH/'" 2>&1 || \
            echo "  WARNING: Failed to sync '$mas_rel_dir'"
    done < "$WORKDIR/missing_dirs.txt"

    echo ""
    echo "  Sync complete."
fi

echo ""
echo "=== Done ==="
echo "Logs in: $WORKDIR/"
