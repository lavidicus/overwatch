#!/bin/bash
# olla-metrics-scraper.sh — Scrapes llama-server /metrics and appends to cost tracking
# Runs via cron or manually. Outputs daily cost data.
#
# Usage: ./olla-metrics-scraper.sh [--reset]
#   --reset: Record current metrics as baseline (run after llama-server restart)

set -euo pipefail

METRICS_URL="http://olla:11434/metrics"
STATE_FILE="/home/localadmin/.openclaw/workspace/cost-tracking/metrics-state.json"
COST_LOG="/home/localadmin/.openclaw/workspace/cost-tracking/local-olla-costs.md"
DAILY_DIR="/home/localadmin/.openclaw/workspace/cost-tracking/daily"

# Cost rates (per million tokens)
INPUT_COST_PER_M=0.04
OUTPUT_COST_PER_M=0.15

# Cloud comparison rates (per million tokens)
CLAUDE_INPUT=15.00
CLAUDE_OUTPUT=75.00

mkdir -p "$(dirname "$STATE_FILE")" "$DAILY_DIR"

# Fetch current metrics
fetch_metrics() {
    local raw
    raw=$(curl -sf "$METRICS_URL" 2>/dev/null) || { echo "ERROR: Cannot reach $METRICS_URL" >&2; exit 1; }
    
    local prompt_tokens predicted_tokens prompt_seconds predicted_seconds prompt_tps predicted_tps
    prompt_tokens=$(echo "$raw" | grep '^llamacpp:prompt_tokens_total ' | awk '{print $2}')
    predicted_tokens=$(echo "$raw" | grep '^llamacpp:tokens_predicted_total ' | awk '{print $2}')
    prompt_seconds=$(echo "$raw" | grep '^llamacpp:prompt_seconds_total ' | awk '{print $2}')
    predicted_seconds=$(echo "$raw" | grep '^llamacpp:tokens_predicted_seconds_total ' | awk '{print $2}')
    prompt_tps=$(echo "$raw" | grep '^llamacpp:prompt_tokens_seconds ' | awk '{print $2}')
    predicted_tps=$(echo "$raw" | grep '^llamacpp:predicted_tokens_seconds ' | awk '{print $2}')
    
    echo "{\"prompt_tokens\":${prompt_tokens:-0},\"predicted_tokens\":${predicted_tokens:-0},\"prompt_seconds\":${prompt_seconds:-0},\"predicted_seconds\":${predicted_seconds:-0},\"prompt_tps\":${prompt_tps:-0},\"predicted_tps\":${predicted_tps:-0},\"timestamp\":$(date +%s)}"
}

# Save baseline state
save_state() {
    local current="$1"
    local today=$(date -u +%Y-%m-%d)
    echo "{\"baseline\":$current,\"date\":\"$today\"}" > "$STATE_FILE"
    echo "Baseline saved for $today"
}

# Calculate costs
calculate_costs() {
    local current="$1"
    local baseline="$2"
    
    python3 -c "
import json, sys

current = json.loads('$current')
baseline = json.loads('$baseline')

# Delta since baseline
input_tokens = current['prompt_tokens'] - baseline['prompt_tokens']
output_tokens = current['predicted_tokens'] - baseline['predicted_tokens']
input_seconds = current['prompt_seconds'] - baseline['prompt_seconds']
output_seconds = current['predicted_seconds'] - baseline['predicted_seconds']

# Current throughput (live gauge, not delta)
input_tps = current['prompt_tps']
output_tps = current['predicted_tps']

# Local costs
input_cost = (input_tokens / 1_000_000) * $INPUT_COST_PER_M
output_cost = (output_tokens / 1_000_000) * $OUTPUT_COST_PER_M
total_cost = input_cost + output_cost

# Cloud equivalent
cloud_input = (input_tokens / 1_000_000) * $CLAUDE_INPUT
cloud_output = (output_tokens / 1_000_000) * $CLAUDE_OUTPUT
cloud_total = cloud_input + cloud_output

savings = cloud_total - total_cost
savings_pct = (savings / cloud_total * 100) if cloud_total > 0 else 0

print(json.dumps({
    'input_tokens': input_tokens,
    'output_tokens': output_tokens,
    'total_tokens': input_tokens + output_tokens,
    'input_seconds': round(input_seconds, 2),
    'output_seconds': round(output_seconds, 2),
    'input_tps': round(input_tps, 1),
    'output_tps': round(output_tps, 1),
    'input_cost': round(input_cost, 4),
    'output_cost': round(output_cost, 4),
    'total_cost': round(total_cost, 4),
    'cloud_input': round(cloud_input, 2),
    'cloud_output': round(cloud_output, 2),
    'cloud_total': round(cloud_total, 2),
    'savings': round(savings, 2),
    'savings_pct': round(savings_pct, 2)
}, indent=2))
"
}

# Main
if [ "${1:-}" = "--reset" ]; then
    current=$(fetch_metrics)
    save_state "$current"
    exit 0
fi

# Fetch current
current=$(fetch_metrics)

# Load or create baseline
if [ ! -f "$STATE_FILE" ]; then
    echo "No baseline found. Creating one now."
    save_state "$current"
    echo "Run again after some usage to see costs."
    exit 0
fi

baseline=$(python3 -c "import json; print(json.dumps(json.load(open('$STATE_FILE'))['baseline']))")
baseline_date=$(python3 -c "import json; print(json.load(open('$STATE_FILE'))['date'])")

# Calculate
costs=$(calculate_costs "$current" "$baseline")

TODAY=$(date -u +%Y-%m-%d)
NOW=$(date -u +%H:%M)

# Output summary
echo "=== Olla Cost Report ==="
echo "Period: $baseline_date to $TODAY $NOW UTC"
echo ""
echo "$costs" | python3 -c "
import json, sys
c = json.load(sys.stdin)
print(f\"Input tokens:  {c['input_tokens']:>12,}  ({c['input_tps']:.1f} tok/s avg)\")
print(f\"Output tokens: {c['output_tokens']:>12,}  ({c['output_tps']:.1f} tok/s avg)\")
print(f\"Total tokens:  {c['total_tokens']:>12,}\")
print()
print(f\"Local cost:    \${c['total_cost']:.4f}  (input: \${c['input_cost']:.4f} + output: \${c['output_cost']:.4f})\")
print(f\"Cloud equiv:   \${c['cloud_total']:.2f}  (Claude Opus 4.6)\")
print(f\"Savings:       \${c['savings']:.2f}  ({c['savings_pct']:.1f}%)\")
"

# Append to daily log
DAILY_FILE="$DAILY_DIR/$TODAY.json"
echo "$costs" | python3 -c "
import json, sys
c = json.load(sys.stdin)
c['timestamp'] = '$(date -u +%Y-%m-%dT%H:%M:%SZ)'
c['baseline_date'] = '$baseline_date'
print(json.dumps(c))
" >> "$DAILY_FILE"

echo ""
echo "Daily log: $DAILY_FILE"
