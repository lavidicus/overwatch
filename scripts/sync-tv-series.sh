#!/bin/bash
set -uo pipefail
MISSING="/tmp/lib-sync/missing_dirs.txt"
SYNCED="/tmp/lib-sync/synced-tv.txt"
LOG="/tmp/lib-sync/tv-transfer.log"
> "$LOG"
> "$SYNCED"
transfer() {
    local dir="$1"
    local ts_path="/SAS/Library/TV_Series/$dir"
    local norm
    norm=$(echo "$dir" | tr '[:upper:]' '[:lower:]' | sed -E 's/season[[:space:]]*([0-9]+)/S\1/g' | sed -E 's/episode[[:space:]]*([0-9]+)/E\1/g' | sed -E 's/\([[:space:]]*\)/ /g' | sed -E 's/[[:space:]]+/ /g' | sed -E 's/^-//;s/-$//')
    local alt
    alt=$(grep "^${norm}|" /tmp/lib-sync/ts_normalized.txt 2>/dev/null <&3 | head -1 | cut -d'|' -f2)
    if [[ -n "$alt" && "$alt" != "$dir" ]]; then
        ts_path="/SAS/Library/TV_Series/$alt"
    fi
    if grep -qxF "$dir" "$SYNCED" 2>/dev/null; then
        echo "$(date -u '+%H:%M:%S') SKIP (resumed): $dir" | tee -a "$LOG"
        return
    fi
    if ssh -o BatchMode=yes -o ConnectTimeout=5 root@ts.9xc.local "[[ -d '$ts_path' ]]" 2>/dev/null; then
        # Check if transfer is complete by comparing sizes
        local mas_size ts_size
        mas_size=$(ssh -o BatchMode=yes -o ConnectTimeout=5 root@mas.9xc.io "du -sb /mas/Library/TV_Series/'$dir' 2>/dev/null | cut -f1")
        ts_size=$(ssh -o BatchMode=yes -o ConnectTimeout=5 root@ts.9xc.local "du -sb '$ts_path' 2>/dev/null | cut -f1")
        if [[ -n "$mas_size" && -n "$ts_size" && "$mas_size" -le "$ts_size" ]]; then
            echo "$(date -u '+%H:%M:%S') SKIP (complete): $dir" | tee -a "$LOG"
            echo "$dir" >> "$SYNCED"
            return
        fi
        echo "$(date -u '+%H:%M:%S') PARTIAL ($ts_size/$mas_size bytes), removing" | tee -a "$LOG"
        ssh -o BatchMode=yes -o ConnectTimeout=5 root@ts.9xc.local "rm -rf '$ts_path'"
    fi
    echo "$(date -u '+%H:%M:%S') TRANSFER: $dir" | tee -a "$LOG"
    ssh -o BatchMode=yes -C root@ts.9xc.local "mkdir -p '$ts_path'"
    ssh -o BatchMode=yes -C root@mas.9xc.io "tar cf - -C /mas/Library/TV_Series '$dir'" 2>/dev/null | ssh -o BatchMode=yes -C root@ts.9xc.local "tar xf - -C /SAS/Library/TV_Series/" 2>&1 | tee -a "$LOG"
    if [[ ${PIPESTATUS[0]} -eq 0 ]]; then
        echo "$dir" >> "$SYNCED"
        echo "$(date -u '+%H:%M:%S') DONE: $dir" | tee -a "$LOG"
    else
        echo "$(date -u '+%H:%M:%S') ERROR: $dir" | tee -a "$LOG"
    fi
}
count=0
while IFS= read -r dir <&3; do
    count=$((count + 1))
    transfer "$dir"
done 3< "$MISSING"
echo "=== DONE ==="
echo "Completed: $(wc -l < "$SYNCED") directories"
