#!/bin/bash
# Start ComfyUI on Olla with optimized settings

OLLAM_HOST="172.16.254.100"

echo "🚀 Starting ComfyUI on Olla..."

# Kill existing ComfyUI
ssh localadmin@$OLLAM_HOST "pkill -f 'python3 main.py' 2>/dev/null; sleep 2"

# Start ComfyUI with lowvram and preview
ssh localadmin@$OLLAM_HOST "cd /home/localadmin/.local/share/comfyui/ComfyUI && \
  python3 main.py \
    --port 8188 \
    --listen 0.0.0.0 \
    --lowvram \
    --preview-method latent2rgb &" 2>&1

sleep 15

# Test if it's running
echo ""
echo "Testing ComfyUI on Olla..."
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
        print('Available nodes:')
        for node in list(data.keys())[:15]:
            print(f'  - {node}')
except Exception as e:
    print(f'ComfyUI not ready: {e}')
"
