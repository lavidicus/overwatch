#!/bin/bash
# Copy ComfyUI to Olla and start it

GATEWAY_HOST="172.16.254.1"
OLLAM_HOST="172.16.254.100"

echo "📦 Copying ComfyUI to Olla..."
echo "📍 From: $GATEWAY_HOST"
echo "📍 To: $OLLAM_HOST"

# Copy ComfyUI directory
scp -r /home/localadmin/.local/share/comfyui localadmin@$OLLAM_HOST:/home/localadmin/.local/share/

echo ""
echo "✅ ComfyUI copied to Olla!"
echo ""
echo "Now starting ComfyUI..."

# Start ComfyUI on Olla
ssh localadmin@$OLLAM_HOST "cd /home/localadmin/.local/share/comfyui/ComfyUI && \
  python3 main.py \
    --port 8188 \
    --listen 0.0.0.0 \
    --gpu-only \
    --preview-method latent2rgb &" 2>&1

sleep 15

# Test if it's running
echo ""
echo "Testing ComfyUI server..."
curl -s "http://localhost:8188/object_info" 2>&1 | python3 -c "
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
        print('LTX nodes available (may need to refresh)')
except Exception as e:
    print(f'ComfyUI not ready: {e}')
"
