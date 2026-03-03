#!/bin/bash
# Deploy llama-server update to olla
# Uses expect-style password input via here-string

set -e

SERVICE_FILE="/tmp/llama-server.service"
SUDO_PASS="NAfb_22_lima"

echo "Deploying llama-server service update..."

# Ensure service file exists on olla
scp llama-server.service localadmin@olla:/tmp/llama-server.service

# Deploy using password via stdin
echo "$SUDO_PASS" | sudo -S cp /tmp/llama-server.service /etc/systemd/system/llama-server.service
echo "$SUDO_PASS" | sudo -S systemctl daemon-reload
echo "$SUDO_PASS" | sudo -S systemctl restart llama-server

# Wait for restart
sleep 5

# Verify
echo ""
echo "Verifying deployment..."
journalctl -u llama-server -n 10 --no-pager | grep -E '(Active|ctx-size)'

echo ""
echo "✅ Deployment complete!"