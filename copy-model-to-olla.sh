#!/bin/bash
# Copy LTX-2.3 model to Olla host

GATEWAY_HOST="172.16.254.1"
OLLAM_HOST="172.16.254.100"
MODEL_SRC="/home/localadmin/.local/share/comfyui/ComfyUI/models/unet/ltx-2.3-22b-dev-Q4_K_M.gguf"
MODEL_DEST="/opt/models/gguf/ltx-2.3-22b-dev-Q4_K_M.gguf"

echo "📦 Copying LTX-2.3 model to Olla..."
echo "📍 Source: $MODEL_SRC"
echo "📍 Dest: $MODEL_DEST"
echo ""

# Copy model to Olla
scp -q "$MODEL_SRC" localadmin@$OLLAM_HOST:$MODEL_DEST

# Verify
ssh localadmin@$OLLAM_HOST "ls -lh $MODEL_DEST"

echo ""
echo "✅ Model copied successfully!"
