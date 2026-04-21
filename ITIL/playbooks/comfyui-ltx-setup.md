# ComfyUI + LTX-2.3 Setup & Maintenance — Playbook

**Category:** Change Management
**Priority:** P3
**Scope:** llama VM (Ubuntu, 2× Quadro P6000)
**Created:** 2026-04-07
**Last Updated:** 2026-04-07

## Goal

Install, configure, and maintain ComfyUI with LTX-2.3 for video/image generation on the `llama` GPU server.

---

## Preconditions

- `llama` reachable via SSH (`ssh localadmin@llama`)
- NVIDIA driver installed (535+), CUDA 12.0+
- 2× Quadro P6000 with 48GB VRAM total
- Python 3.12+
- Sufficient disk (~30GB for models + venv)

---

## Installation Procedure

### 1) Clone ComfyUI

```bash
ssh localadmin@llama
cd /home/localadmin
git clone https://github.com/Comfy-Org/ComfyUI.git
cd ComfyUI
```

### 2) Create venv + install PyTorch

```bash
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements.txt
pip install gguf huggingface_hub
```

### 3) Install ComfyUI-GGUF custom node

```bash
cd custom_nodes
git clone https://github.com/city96/ComfyUI-GGUF.git
cd ComfyUI-GGUF && pip install -r requirements.txt && cd ..
```

### 4) Download models

```bash
cd /home/localadmin/ComfyUI && source venv/bin/activate
python3 -c "
from huggingface_hub import hf_hub_download
import os
m = '/home/localadmin/ComfyUI/models'

# Diffusion model (or symlink from /opt/models/gguf/ltx-2.3.gguf)
p = hf_hub_download('unsloth/LTX-2.3-GGUF', 'ltx-2.3-22b-dev-Q4_K_M.gguf')
os.symlink(p, f'{m}/unet/ltx-2.3-22b-dev-Q4_K_M.gguf')

# VAEs
p = hf_hub_download('unsloth/LTX-2.3-GGUF', 'vae/ltx-2.3-22b-dev_video_vae.safetensors')
os.symlink(p, f'{m}/vae/ltx-2.3-22b-dev_video_vae.safetensors')

p = hf_hub_download('unsloth/LTX-2.3-GGUF', 'vae/ltx-2.3-22b-dev_audio_vae.safetensors')
os.symlink(p, f'{m}/vae/ltx-2.3-22b-dev_audio_vae.safetensors')

# Text encoder connector
p = hf_hub_download('unsloth/LTX-2.3-GGUF', 'text_encoders/ltx-2.3-22b-dev_embeddings_connectors.safetensors')
os.symlink(p, f'{m}/text_encoders/ltx-2.3-22b-dev_embeddings_connectors.safetensors')

# Gemma text encoder
p = hf_hub_download('unsloth/gemma-3-12b-it-qat-GGUF', 'gemma-3-12b-it-qat-UD-Q4_K_XL.gguf')
os.symlink(p, f'{m}/text_encoders/gemma-3-12b-it-qat-UD-Q4_K_XL.gguf')

p = hf_hub_download('unsloth/gemma-3-12b-it-qat-GGUF', 'mmproj-BF16.gguf')
os.symlink(p, f'{m}/text_encoders/mmproj-BF16.gguf')

print('All models downloaded and linked.')
"
```

### 5) Create systemd service

```bash
sudo tee /etc/systemd/system/sd-server.service > /dev/null << 'EOF'
[Unit]
Description=ComfyUI LTX-2.3 Video Generation Server
After=network.target

[Service]
Type=simple
User=localadmin
Group=localadmin
WorkingDirectory=/home/localadmin/ComfyUI
Environment=PATH=/home/localadmin/ComfyUI/venv/bin:/usr/local/bin:/usr/bin:/bin
Environment=VIRTUAL_ENV=/home/localadmin/ComfyUI/venv
ExecStart=/home/localadmin/ComfyUI/venv/bin/python3 main.py --port 8188 --listen 0.0.0.0 --preview-method latent2rgb
Restart=on-failure
RestartSec=10
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable sd-server
sudo systemctl start sd-server
```

### 6) Verify

```bash
# Service running
systemctl is-active sd-server

# API responding
curl -s http://localhost:8188/system_stats | python3 -m json.tool

# LTX nodes available
curl -s http://localhost:8188/object_info | python3 -c "
import sys,json; d=json.load(sys.stdin)
ltx = [k for k in d if 'ltx' in k.lower() or 'gguf' in k.lower()]
print(f'{len(ltx)} LTX/GGUF nodes found')
"
```

---

## Verification Checklist

- [ ] `nvidia-smi` shows 2× P6000
- [ ] `python3 -c "import torch; print(torch.cuda.is_available())"` → True
- [ ] `systemctl is-active sd-server` → active
- [ ] `curl http://localhost:8188/system_stats` → 200
- [ ] LTX/GGUF nodes available in `/object_info`

---

## Maintenance

### Update ComfyUI

```bash
ssh localadmin@llama "cd /home/localadmin/ComfyUI && git pull && source venv/bin/activate && pip install -r requirements.txt && sudo systemctl restart sd-server"
```

### Update ComfyUI-GGUF

```bash
ssh localadmin@llama "cd /home/localadmin/ComfyUI/custom_nodes/ComfyUI-GGUF && git pull && sudo systemctl restart sd-server"
```

### Swap between LLM and Diffusion

```bash
# To diffusion
ssh localadmin@llama "sudo systemctl stop llama-server && sudo systemctl start sd-server"

# To LLM
ssh localadmin@llama "sudo systemctl stop sd-server && sudo systemctl start llama-server"
```

---

## Rollback

```bash
sudo systemctl stop sd-server
sudo systemctl disable sd-server
sudo rm -f /etc/systemd/system/sd-server.service
sudo systemctl daemon-reload
# Optionally remove: rm -rf /home/localadmin/ComfyUI/venv
```

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Service fails to start | llama-server using VRAM | Stop llama-server first |
| CUDA OOM during generation | Resolution/frames too high | Reduce width/height/frames |
| "No module named torch" | Wrong python used | Verify venv PATH in service |
| Model not found in UI | Broken symlink | Re-run hf_hub_download |
| Slow generation | Pascal GPU (compute 6.1) | Expected; reduce resolution |

---

## Configuration Notes

| Setting | Value |
|---------|-------|
| PyTorch | 2.5.1+cu121 |
| ComfyUI | 0.18.1 |
| CUDA toolkit | 12.0.140 |
| Driver | 535.288.01 |
| Port | 8188 |
| Models dir | `/home/localadmin/ComfyUI/models/` |
| HF cache | `/home/localadmin/.cache/huggingface/` |
