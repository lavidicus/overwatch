#!/bin/bash
# Quick batch domain checker using the fixed skill

DOMAINS="adm.sh adm.cx adm.pm adm.to adm.so ops.sh ops.cx ops.to ops.pm ctlr.io ctl.io netx.io netr.io netd.io corex.io cor3.io c0re.io"

echo "🔍 Checking domain availability...\n"

for domain in $DOMAINS; do
  echo "Checking: $domain"
  node /home/localadmin/.openclaw/workspace/skills/domain-checker/domain-checker.js $domain 2>/dev/null | grep -A1 "Status:"
  echo ""
done
