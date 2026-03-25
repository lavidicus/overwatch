#!/bin/bash
# Build and install newer llama.cpp on Olla host
# This version supports longer tensor names (70+ chars)

set -e

OLLAM_HOST="172.16.254.100"

echo "🔧 Building newer llama.cpp on Olla..."
echo "📍 Target: $OLLAM_HOST"
echo ""

# SSH to Olla and build
ssh localadmin@$OLLAM_HOST << 'EOF'
cd /tmp

# Clone latest llama.cpp
if [ ! -d "llama.cpp" ]; then
    git clone https://github.com/ggerganov/llama.cpp
    cd llama.cpp
    git pull
else
    cd llama.cpp
    git pull
fi

# Build with full support
mkdir -p build
cd build

cmake .. \
  -DGGML_CUDA=ON \
  -DGGML_CUBLAS=ON \
  -DCMAKE_BUILD_TYPE=Release \
  -DLLAMA_CURL=ON \
  -DLLAMA_SERVER=ON

make -j$(nproc)

# Install
sudo cp llama-server /opt/llama.cpp/build/bin/llama-server

echo "✅ Newer llama.cpp installed!"
EOF

echo ""
echo "✅ Build complete!"
echo ""
echo "To start LTX-2.3:"
echo "  ssh localadmin@$OLLAM_HOST"
echo "  /opt/llama.cpp/build/bin/llama-server \\"
echo "    -m /home/localadmin/.llama/models/ltx-2.3-22b-dev-Q4_K_M.gguf \\"
echo "    --port 11435 \\"
echo "    --n-gpu-layers 35 \\"
echo "    --ctx-size 4096"
