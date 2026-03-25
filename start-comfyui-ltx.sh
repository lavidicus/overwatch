#!/bin/bash
# Start ComfyUI with LTX-2.3 and test image generation

COMFY_DIR="/home/localadmin/.local/share/comfyui/ComfyUI"
PORT=8188
MODEL_PATH="/home/localadmin/.local/share/comfyui/ComfyUI/models/unet/ltx-2.3-22b-dev-Q4_K_M.gguf"
VAE_PATH="/home/localadmin/.local/share/comfyui/ComfyUI/models/vae/vae/ltx-2.3-22b-dev_video_vae.safetensors"
TEXT_ENC_PATH="/home/localadmin/.local/share/comfyui/ComfyUI/models/text_encoders/text_encoders/ltx-2.3-22b-dev_embeddings_connectors.safetensors"

echo "🚀 Starting ComfyUI with LTX-2.3..."
echo "📍 Model: $MODEL_PATH"
echo "📍 VAE: $VAE_PATH"
echo "📍 Text Encoder: $TEXT_ENC_PATH"
echo "📍 Port: $PORT"
echo ""

cd "$COMFY_DIR"

# Start ComfyUI in background
python3 main.py \
  --port $PORT \
  --listen 0.0.0.0 \
  --preview-method latent2rgb \
  --gpu-only &

COMFY_PID=$!

echo "✅ ComfyUI started (PID: $COMFY_PID)"
echo ""
echo "Access: http://localhost:$PORT"

# Wait for it to start
sleep 20

# Check if running
echo "Checking if ComfyUI is ready..."
if curl -s "http://localhost:$PORT/object_info" > /dev/null 2>&1; then
    echo "✅ ComfyUI is ready!"
    
    # List available workflows/nodes
    echo ""
    echo "Available nodes:"
    curl -s "http://localhost:$PORT/object_info" 2>&1 | python3 -c "
import sys, json
data = json.load(sys.stdin)
ltx_nodes = [k for k in data.keys() if 'LTX' in k.upper() or 'GGUF' in k.upper() or 'Diffusion' in k.upper()]
for node in ltx_nodes:
    print(f'  - {node}')
"
else
    echo "⚠️ ComfyUI still starting..."
fi
