#!/bin/bash
# Install ComfyUI with GGUF support
# For 24GB VRAM setup (3090)

set -e

COMFY_DIR="$HOME/.local/share/comfyui"
GGUF_DIR="$COMFY_DIR/custom_nodes/ComfyUI-GGUF"

echo "📦 Installing ComfyUI..."
mkdir -p "$COMFY_DIR"
cd "$COMFY_DIR"

# Clone ComfyUI
if [ ! -d "ComfyUI" ]; then
    echo "Cloning ComfyUI..."
    git clone https://github.com/comfyanonymous/ComfyUI.git
else
    echo "ComfyUI already exists"
fi

cd ComfyUI

# Install requirements
echo "📦 Installing ComfyUI requirements..."
pip install --break-system-packages -r requirements.txt

# Install ComfyUI-GGUF
echo "📦 Installing ComfyUI-GGUF..."
cd custom_nodes
if [ ! -d "ComfyUI-GGUF" ]; then
    git clone https://github.com/city96/ComfyUI-GGUF
else
    echo "ComfyUI-GGUF already exists"
fi

cd ComfyUI-GGUF
pip install --break-system-packages --upgrade gguf

echo "✅ ComfyUI + GGUF installed!"
echo "📍 Location: $COMFY_DIR/ComfyUI"
echo "📍 GGUF nodes: $GGUF_DIR"
