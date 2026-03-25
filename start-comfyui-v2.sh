#!/bin/bash
# Start ComfyUI with LTX-2.3 (corrected args)

COMFY_DIR="/home/localadmin/.local/share/comfyui/ComfyUI"
PORT=8188

echo "🚀 Starting ComfyUI with LTX-2.3..."
echo "📍 ComfyUI: $COMFY_DIR"
echo "📍 Port: $PORT"
echo ""

cd "$COMFY_DIR"

# Start ComfyUI in background
python3 main.py \
  --port $PORT \
  --listen 0.0.0.0 &

COMFY_PID=$!

echo "✅ ComfyUI started (PID: $COMFY_PID)"
echo ""
echo "Access: http://localhost:$PORT"
echo "Models: LTX-2.3 in models/unet/"

# Wait for it to start
sleep 15

# Test API
echo "Testing API..."
curl -s "http://localhost:$PORT/object_info" 2>&1 | head -30
