#!/bin/bash
# Start llama-server with LTX-2.3 on Olla host

OLLAM_HOST="172.16.254.100"
MODEL_PATH="/home/localadmin/.local/share/comfyui/ComfyUI/models/unet/ltx-2.3-22b-dev-Q4_K_M.gguf"
PORT=11435

echo "🚀 Starting llama-server with LTX-2.3..."
echo "📍 Model: $MODEL_PATH"
echo "📍 Port: $PORT"
echo ""

# SSH to Olla and start llama-server
ssh localadmin@$OLLAM_HOST "cd /home/localadmin && \
  llama-server \
    -m $MODEL_PATH \
    --port $PORT \
    --n-gpu-layers 35 \
    --ctx-size 4096 \
    --threads 8 \
    --host 0.0.0.0" &

echo "✅ llama-server started on port $PORT"
echo ""
echo "To test:"
echo "  curl http://localhost:$PORT/v1/completions \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -d '{\"model\":\"ltx-2.3-22b-dev-Q4_K_M\",\"prompt\":\"test\"}'"
