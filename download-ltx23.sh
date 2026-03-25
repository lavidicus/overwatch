#!/bin/bash
# Download LTX-2.3 GGUF model
# Size: ~5GB (4-bit quantized)

set -e

LTX_DIR="$HOME/.local/share/comfyui/ComfyUI/models/unet"
MODEL_NAME="ltx-2.3-22b-fp8.gguf"

echo "📥 Downloading LTX-2.3 GGUF model..."
mkdir -p "$LTX_DIR"

cd "$LTX_DIR"

# Download from HuggingFace using hf transfer (if available) or wget with token
if command -v huggingface-cli &> /dev/null; then
    echo "Using huggingface-cli..."
    huggingface-cli download city96/LTX-Video-2B-GGUF ltx-2.3-22b-fp8.gguf --local-dir .
else
    echo "Using wget..."
    wget -c https://huggingface.co/city96/LTX-Video-2B-GGUF/resolve/main/ltx-2.3-22b-fp8.gguf \
      -O "$MODEL_NAME"
fi

echo "✅ Model downloaded: $LTX_DIR/$MODEL_NAME"
echo "📊 Size: $(du -h "$LTX_DIR/$MODEL_NAME" | cut -f1)"
