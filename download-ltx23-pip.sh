#!/bin/bash
# Download LTX-2.3 GGUF model using pip
# Size: ~5GB (4-bit quantized)

set -e

LTX_DIR="$HOME/.local/share/comfyui/ComfyUI/models/unet"
MODEL_NAME="ltx-2.3-22b-fp8.gguf"

echo "📥 Downloading LTX-2.3 GGUF model via pip..."
mkdir -p "$LTX_DIR"

cd "$LTX_DIR"

# Install huggingface-hub if needed
pip install --break-system-packages huggingface-hub 2>&1 | tail -5

# Download using Python
python3 << 'EOF'
from huggingface_hub import hf_hub_download
import os

model_id = "city96/LTX-Video-2B-GGUF"
filename = "ltx-2.3-22b-fp8.gguf"
download_dir = os.path.expanduser("~/.local/share/comfyui/ComfyUI/models/unet")

print(f"Downloading {filename} from {model_id}...")
path = hf_hub_download(
    repo_id=model_id,
    filename=filename,
    subfolder="",
    local_dir=download_dir,
    local_dir_use_symlinks=False
)
print(f"✅ Downloaded to: {path}")
EOF

echo "📊 Size: $(du -h "$LTX_DIR/$MODEL_NAME" | cut -f1)"
