#!/bin/bash
# Parse llama-server tok/s metrics from node2 journalctl
# Returns JSON: {"input_tps": NNN.NN, "output_tps": NNN.NN, "requests": N}
# Looks at last ~5 min of request completions

NODE_HOST="${NODE_HOST:-node2}"
WINDOW="${WINDOW:-5}"

LOGS=$(ssh -o ConnectTimeout=5 localadmin@${NODE_HOST} \
  "journalctl -u llama-server.service --since '${WINDOW} min ago' --no-pager 2>/dev/null")

input_toks=0; input_time_ms=0; input_count=0
output_toks=0; output_time_ms=0; output_count=0

while IFS= read -r line; do
    # Match: "prompt eval time =  XXXX.XX ms /  XXXX tokens (  XX.XX ms per token,   XXX.XX tokens per second)"
    if echo "$line" | grep -q "prompt eval time"; then
        toks=$(echo "$line" | grep -oP '/\s*\K[0-9]+(?=\s*tokens)')
        ms=$(echo "$line" | grep -oP 'prompt eval time = \s*\K[0-9.]+')
        if [ -n "$toks" ] && [ -n "$ms" ] && [ "$toks" -gt 0 ] 2>/dev/null; then
            input_toks=$((input_toks + toks))
            input_time_ms=$(awk "BEGIN {printf \"%.0f\", $input_time_ms + $ms}")
            input_count=$((input_count + 1))
        fi
    fi
    # Match: "eval time =  XXXX.XX ms /  XXXX tokens (  XX.XX ms per token,   XXX.XX tokens per second)"
    # (NOT "prompt eval time" and NOT "total time")
    if echo "$line" | grep -qP '^\S.*eval time = ' && ! echo "$line" | grep -q 'prompt eval time' && ! echo "$line" | grep -q 'total time'; then
        toks=$(echo "$line" | grep -oP '/\s*\K[0-9]+(?=\s*tokens)')
        ms=$(echo "$line" | grep -oP 'eval time = \s*\K[0-9.]+')
        if [ -n "$toks" ] && [ -n "$ms" ] && [ "$toks" -gt 0 ] 2>/dev/null; then
            output_toks=$((output_toks + toks))
            output_time_ms=$(awk "BEGIN {printf \"%.0f\", $output_time_ms + $ms}")
            output_count=$((output_count + 1))
        fi
    fi
done <<< "$LOGS"

input_tps="0"
if [ "$input_count" -gt 0 ] && [ "$input_time_ms" -gt 0 ]; then
    input_tps=$(awk "BEGIN {printf \"%.1f\", ($input_toks / $input_time_ms) * 1000}")
fi

output_tps="0"
if [ "$output_count" -gt 0 ] && [ "$output_time_ms" -gt 0 ]; then
    output_tps=$(awk "BEGIN {printf \"%.1f\", ($output_toks / $output_time_ms) * 1000}")
fi

requests=$((input_count + output_count))

cat <<EOF
{"input_tps":${input_tps},"output_tps":${output_tps},"requests":${requests}}
EOF
