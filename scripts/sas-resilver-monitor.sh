#!/bin/bash
# SAS ZFS resilver monitor
STATUS=$(ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no root@ts.9xc.local "zpool status SAS" 2>/dev/null)
if echo "$STATUS" | grep -q "state: DEGRADED"; then
  SCAN=$(echo "$STATUS" | grep "scan: resilver" | head -1)
  echo "SAS Resilver: $SCAN"
else
  echo "SAS Resilver: COMPLETE - Pool healthy"
  rm -f ~/.openclaw/workspace/scripts/sas-resilver-monitor.sh
fi
