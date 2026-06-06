#!/bin/bash
#
# node2-monthly-report.sh — Monthly cost summary for node2
# Usage: bash ~/.openclaw/workspace/cost-tracking/node2-monthly-report.sh [YYYY-MM]
#

set -euo pipefail

OUTPUT_DIR="$HOME/.openclaw/workspace/cost-tracking/daily"
TARGET_MONTH="${1:-$(date +%Y-%m)}"
YEAR=$(echo "$TARGET_MONTH" | cut -d- -f1)
MONTH=$(echo "$TARGET_MONTH" | cut -d- -f2)

echo "=== Node2 Monthly Cost Report — $TARGET_MONTH ==="
echo ""

# Count daily files (exclude sample files)
DAILY_FILES=$(ls "$OUTPUT_DIR"/node2-${YEAR}-${MONTH}-*.json 2>/dev/null | grep -v sample | wc -l)
SAMPLE_FILES=$(ls "$OUTPUT_DIR"/node2-${YEAR}-${MONTH}-*-sample-*.json 2>/dev/null | wc -l)

if [ "$DAILY_FILES" -eq 0 ]; then
    echo "No daily metrics found for $TARGET_MONTH"
    exit 0
fi

# Aggregate costs from daily summaries
TOTAL_ELECTRICITY=0
TOTAL_DAILY_COST=0
AVG_POWER_SUM=0
AVG_POWER_COUNT=0
MAX_POWER=0
TOTAL_SAMPLES=0

for f in "$OUTPUT_DIR"/node2-${YEAR}-${MONTH}-*.json; do
    [ -f "$f" ] || continue
    # Skip sample files (they start with node2-YYYY-MM-DD-sample-)
    basename_f=$(basename "$f")
    if echo "$basename_f" | grep -q "sample-"; then
        continue
    fi
    
    ELEC=$(jq -r '.costs.electricity_daily // 0' "$f")
    TOTAL=$(jq -r '.costs.total_daily // 0' "$f")
    AVG_PWR=$(jq -r '.average_power_w // 0' "$f")
    SAMPLES=$(jq -r '.samples_collected // 0' "$f")
    
    TOTAL_ELECTRICITY=$(awk "BEGIN {printf \"%.4f\", $TOTAL_ELECTRICITY + $ELEC}")
    TOTAL_DAILY_COST=$(awk "BEGIN {printf \"%.4f\", $TOTAL_DAILY_COST + $TOTAL}")
    
    if [ "$AVG_PWR" != "0" ] && [ "$AVG_PWR" != "null" ]; then
        AVG_POWER_SUM=$(awk "BEGIN {printf \"%.2f\", $AVG_POWER_SUM + $AVG_PWR}")
        AVG_POWER_COUNT=$((AVG_POWER_COUNT + 1))
    fi
    
    TOTAL_SAMPLES=$((TOTAL_SAMPLES + SAMPLES))
done

# Calculate overall averages
if [ "$AVG_POWER_COUNT" -gt 0 ]; then
    OVERALL_AVG_POWER=$(awk "BEGIN {printf \"%.2f\", $AVG_POWER_SUM / $AVG_POWER_COUNT}")
else
    OVERALL_AVG_POWER=0
fi

# Calculate from raw samples if available
SAMPLE_AVG_POWER=0
SAMPLE_POWER_SUM=0
SAMPLE_POWER_COUNT=0

for sf in $(ls "$OUTPUT_DIR"/node2-${YEAR}-${MONTH}-*-sample-*.json 2>/dev/null); do
    [ -f "$sf" ] || continue
    PWR=$(jq -r '.power.total_system_w // 0' "$sf")
    if [ "$PWR" != "0" ] && [ "$PWR" != "null" ]; then
        SAMPLE_POWER_SUM=$(awk "BEGIN {printf \"%.2f\", $SAMPLE_POWER_SUM + $PWR}")
        SAMPLE_POWER_COUNT=$((SAMPLE_POWER_COUNT + 1))
        MAX_POWER=$(awk "BEGIN {print ($PWR > $MAX_POWER) ? $PWR : $MAX_POWER}")
    fi
done

if [ "$SAMPLE_POWER_COUNT" -gt 0 ]; then
    SAMPLE_AVG_POWER=$(awk "BEGIN {printf \"%.2f\", $SAMPLE_POWER_SUM / $SAMPLE_POWER_COUNT}")
    # Use sample average if it has more data points
    if [ "$SAMPLE_POWER_COUNT" -gt "$AVG_POWER_COUNT" ]; then
        OVERALL_AVG_POWER=$SAMPLE_AVG_POWER
    fi
fi

# Monthly projections
DAYS_IN_MONTH=$(date -d "${YEAR}-${MONTH}-01 + 1 month - 1 day" +%d 2>/dev/null || echo "31")
if [ -z "$DAYS_IN_MONTH" ] || [ "$DAYS_IN_MONTH" = "00" ]; then
    DAYS_IN_MONTH=31
fi

PROJECTED_MONTHLY_ELEC=$(awk "BEGIN {printf \"%.2f\", $TOTAL_ELECTRICITY / $DAILY_FILES * $DAYS_IN_MONTH}")
PROJECTED_MONTHLY_TOTAL=$PROJECTED_MONTHLY_ELEC

echo "📊 Hardware"
echo "   2× NVIDIA Quadro P6000 (24GB each)"
echo "   Intel Xeon E5-2680 v4 (28 cores)"
echo "   64GB RAM"
echo ""
echo "📈 Sampling"
echo "   Daily summaries: $DAILY_FILES days"
echo "   Individual samples: $SAMPLE_FILES"
echo "   Total samples: $TOTAL_SAMPLES"
echo ""
echo "💰 Costs (running costs only)"
echo "   Electricity collected:            \$$TOTAL_ELECTRICITY"
echo "   Rate:                              \$0.155/kWh"
echo "   Average power draw:                ${OVERALL_AVG_POWER}W"
echo "   Peak power draw:                   ${MAX_POWER}W"
echo "   ─────────────────────────────────"
echo "   Total cost to date:                \$$TOTAL_DAILY_COST"
echo ""
echo "📅 Monthly Projections (based on $DAILY_FILES days sampled)"
echo "   Projected electricity:             \$$PROJECTED_MONTHLY_ELEC"
echo "   Projected total:                   \$$PROJECTED_MONTHLY_TOTAL"
echo ""
echo "---"
echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
