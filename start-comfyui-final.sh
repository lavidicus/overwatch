#!/bin/bash
# Start ComfyUI with LTX-2.3 on Olla

OLLAM_HOST="172.16.254.100"

echo "🚀 Starting ComfyUI with LTX-2.3..."
echo "📍 This will stop Qwen3.5 first to free VRAM"
echo ""

# Stop Qwen3.5
echo "1️⃣ Stopping Qwen3.5..."
ssh localadmin@$OLLAM_HOST "sudo systemctl stop llama-server 2>/dev/null || pkill -f llama-server"
sleep 2

# Verify VRAM is free
echo "2️⃣ Checking GPU memory..."
ssh localadmin@$OLLAM_HOST "nvidia-smi -q | grep 'Used GPU Memory'" | head -1

# Start ComfyUI
echo "3️⃣ Starting ComfyUI..."
ssh localadmin@$OLLAM_HOST "cd /home/localadmin/.local/share/comfyui/ComfyUI && \
  python3 main.py \
    --port 8188 \
    --listen 0.0.0.0 \
    --lowvram \
    --preview-method latent2rgb &"

sleep 15

# Test if running
echo ""
echo "4️⃣ Testing ComfyUI..."
if curl -s "http://localhost:8188/object_info" > /dev/null 2>&1; then
    echo "✅ ComfyUI is running on http://localhost:8188"
    
    # Show available nodes
    echo ""
    echo "📦 Available LTX/GGUF nodes:"
    curl -s "http://localhost:8188/object_info" | python3 -c "
import sys, json
data = json.load(sys.stdin)
ltx_nodes = [k for k in data.keys() if 'LTX' in k.upper() or 'GGUF' in k.upper() or 'Diffusion' in k.upper()]
for node in ltx_nodes[:10]:
    print(f'  - {node}')
"
else
    echo "⚠️ ComfyUI may still be starting..."
fi

echo ""
echo "📍 Access: http://localhost:8188"
echo "📍 To stop: ssh localadmin@$OLLAM_HOST 'pkill -f python3 main.py'"
