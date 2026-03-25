#!/bin/bash
# Copy LTX-2.3 model to Olla host (user writable location)

OLLAM_HOST="172.16.254.100"
MODEL_SRC="/home/localadmin/.local/share/comfyui/ComfyUI/models/unet/ltx-2.3-22b-dev-Q4_K_M.gguf"
MODEL_DEST="/home/localadmin/.llama/models/ltx-2.3-22b-dev-Q4_K_M.gguf"

echo "📦 Copying LTX-2.3 model to Olla..."
echo "📍 Source: $MODEL_SRC"
echo "📍 Dest: $MODEL_DEST"
echo ""

# Create destination directory first
ssh localadmin@$OLLAM_HOST "mkdir -p /home/localadmin/.llama/models"

# Copy model
scp "$MODEL_SRC" localadmin@$OLLAM_HOST:$MODEL_DEST

# Verify
ssh localadmin@$OLLAM_HOST "ls -lh $MODEL_DEST"

echo ""
echo "✅ Model copied successfully!"
