#!/bin/bash
# Run on node2 — parse llama-server logs for tok/s
journalctl -u llama-server.service --since "5 min ago" --no-pager 2>/dev/null | awk '
  /prompt eval time/ {
    match($0, /prompt eval time = ([0-9.]+) ms \/ ([0-9]+) tokens/, a)
    if (a[1] && a[2]) { ptime += a[1]; ptoks += a[2]; pc++ }
  }
  /^[[:space:]]*eval time = / && !/prompt eval/ {
    match($0, /eval time = ([0-9.]+) ms \/ ([0-9]+) tokens/, a)
    if (a[1] && a[2]) { otime += a[1]; otoks += a[2]; oc++ }
  }
  END {
    pt = (pc>0 && ptime>0) ? sprintf("%.1f", (ptoks/ptime)*1000) : "0"
    ot = (oc>0 && otime>0) ? sprintf("%.1f", (otoks/otime)*1000) : "0"
    printf "{\"input_tps\":%s,\"output_tps\":%s,\"requests\":%d}\n", pt, ot, pc+oc
  }
' 2>/dev/null || echo '{}'
