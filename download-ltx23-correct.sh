#!/bin/bash
# Download LTX-2.3 GGUF model from correct repo
# Size: ~5GB (fp8 quantized)

set -e

LTX_DIR="$HOME/.local/share/comfyui/ComfyUI/models/unet"
MODEL_NAME="ltx-2.3-22b-fp8.gguf"

echo "📥 Downloading LTX-2.3 GGUF model..."
mkdir -p "$LTX_DIR"

cd "$LTX_DIR"

# Download using Python
python3 << 'EOF'
from huggingface_hub import hf_hub_download
import os

# Correct model repo
model_id = "unsloth/LTX-2.3-GGUF"
filename = "LTX-2.3-22B-fp8.gguf"
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
ls -lh "$LTX_DIR/$MODEL_NAME"
