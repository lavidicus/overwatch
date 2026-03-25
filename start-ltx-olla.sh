#!/bin/bash
# Start LTX-2.3 on Olla with the newer llama.cpp build

OLLAM_HOST="172.16.254.100"

echo "🚀 Starting LTX-2.3 on Olla..."
echo "📍 Host: $OLLAM_HOST"
echo "📍 Model: /home/localadmin/.llama/models/ltx-2.3-22b-dev-Q4_K_M.gguf"
echo ""

# Kill any existing LTX server
ssh localadmin@$OLLAM_HOST "pkill -f 'llama-server.*11435' 2>/dev/null; sleep 2"

# Start LTX-2.3
ssh localadmin@$OLLAM_HOST "/opt/llama.cpp/build/bin/llama-server \
  -m /home/localadmin/.llama/models/ltx-2.3-22b-dev-Q4_K_M.gguf \
  --port 11435 \
  --n-gpu-layers 35 \
  --ctx-size 4096 \
  --threads 8 \
  --host 0.0.0.0 &"

sleep 8

# Test if it's running
echo "Testing LTX-2.3 server..."
curl -s http://localhost:11435/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"ltx-2.3-22b-dev-Q4_K_M","prompt":"A beautiful sunset, digital art, highly detailed","max_tokens":100}' 2>&1 | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print('✅ LTX-2.3 is responding!')
    print('Response:', data.get('text', data.get('choices', [{}])[0].get('text', 'N/A'))[:200])
except:
    print('Response:', sys.stdin.read()[:500])
"
