#!/bin/bash
# Download LTX-2.3 models from unsloth/LTX-2.3-GGUF
# Size: ~5GB total

set -e

LTX_DIR="$HOME/.local/share/comfyui/ComfyUI/models/unet"
VAE_DIR="$HOME/.local/share/comfyui/ComfyUI/models/vae"
TEXT_ENC_DIR="$HOME/.local/share/comfyui/ComfyUI/models/text_encoders"

echo "📥 Downloading LTX-2.3 models..."
mkdir -p "$LTX_DIR" "$VAE_DIR" "$TEXT_ENC_DIR"

cd "$LTX_DIR"

# Download using Python
python3 << 'EOF'
from huggingface_hub import hf_hub_download
import os

base_dir = os.path.expanduser("~/.local/share/comfyui/ComfyUI")

# Download main model
print("Downloading LTX-2.3 dev model...")
path = hf_hub_download(
    repo_id="unsloth/LTX-2.3-GGUF",
    filename="ltx-2.3-22b-dev-Q4_K_M.gguf",
    subfolder="",
    local_dir=base_dir + "/models/unet",
    local_dir_use_symlinks=False
)
print(f"✅ Model: {path}")

# Download VAE
print("Downloading LTX-2.3 VAE...")
path = hf_hub_download(
    repo_id="unsloth/LTX-2.3-GGUF",
    filename="ltx-2.3-22b-dev_video_vae.safetensors",
    subfolder="vae",
    local_dir=base_dir + "/models/vae",
    local_dir_use_symlinks=False
)
print(f"✅ VAE: {path}")

# Download text encoders
print("Downloading LTX-2.3 text encoders...")
path = hf_hub_download(
    repo_id="unsloth/LTX-2.3-GGUF",
    filename="ltx-2.3-22b-dev_embeddings_connectors.safetensors",
    subfolder="text_encoders",
    local_dir=base_dir + "/models/text_encoders",
    local_dir_use_symlinks=False
)
print(f"✅ Text Encoder: {path}")

print("\n✅ All LTX-2.3 models downloaded!")
EOF

echo ""
echo "📊 Model sizes:"
ls -lh "$LTX_DIR/"
ls -lh "$VAE_DIR/"
ls -lh "$TEXT_ENC_DIR/"
