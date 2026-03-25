#!/bin/bash
# Install ComfyUI dependencies on Olla

OLLAM_HOST="172.16.254.100"

echo "📦 Installing ComfyUI dependencies on Olla..."

# SSH to Olla and install requirements
ssh localadmin@$OLLAM_HOST "cd /home/localadmin/.local/share/comfyui/ComfyUI && \
  pip install --break-system-packages -r requirements.txt 2>&1 | tail -20"

echo ""
echo "✅ Dependencies installed!"
