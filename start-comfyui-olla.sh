#!/bin/bash
# Start ComfyUI on Olla host with CUDA

OLLAM_HOST="172.16.254.100"
PORT=8188

echo "🚀 Starting ComfyUI on Olla..."
echo "📍 Host: $OLLAM_HOST"
echo "📍 Port: $PORT"
echo ""

# SSH to Olla and start ComfyUI
ssh localadmin@$OLLAM_HOST "cd /home/localadmin/.local/share/comfyui/ComfyUI && \
  python3 main.py \
    --port $PORT \
    --listen 0.0.0.0 \
    --gpu-only \
    --preview-method latent2rgb &" 2>&1

sleep 15

# Test if it's running
echo "Testing ComfyUI server..."
curl -s "http://localhost:$PORT/object_info" 2>&1 | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('✅ ComfyUI is ready on Olla!')
    
    # List LTX nodes
    ltx_nodes = [k for k in data.keys() if 'LTX' in k.upper() or 'GGUF' in k.upper()]
    if ltx_nodes:
        print(f'Found {len(ltx_nodes)} LTX/GGUF nodes:')
        for node in ltx_nodes:
            print(f'  - {node}')
    else:
        print('No LTX/GGUF nodes found yet (may need to refresh)')
except Exception as e:
    print(f'ComfyUI not ready: {e}')
"
