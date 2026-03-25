#!/bin/bash
# Install CUDA driver on Olla host for ComfyUI

OLLAM_HOST="172.16.254.100"

echo "🔧 Installing CUDA driver on Olla..."
echo "📍 Host: $OLLAM_HOST"
echo ""

# SSH to Olla and install CUDA toolkit
ssh localadmin@$OLLAM_HOST << 'EOF'
# Check current CUDA version
echo "Current CUDA version:"
nvcc --version 2>&1 | head -1 || echo "nvcc not found"

# Install/Update CUDA toolkit (Ubuntu 24.04)
echo "Installing CUDA toolkit..."
apt-get update -qq
apt-get install -y -qq cuda-toolkit-12-0 2>&1 | tail -5

# Verify installation
echo ""
echo "Installed CUDA version:"
nvcc --version 2>&1 | head -1
EOF

echo ""
echo "✅ CUDA driver installation complete!"
echo ""
echo "Now restart ComfyUI:"
echo "  cd /home/localadmin/.local/share/comfyui/ComfyUI"
echo "  python3 main.py --port 8188 --listen 0.0.0.0"
