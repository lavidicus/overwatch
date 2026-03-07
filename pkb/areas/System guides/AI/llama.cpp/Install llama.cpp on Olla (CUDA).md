# Install llama.cpp on Olla (CUDA, sm_86)

**Target:** Olla VM (Ubuntu 24.04) with RTX 3090  
**Last Updated:** 2026-03-07

## 1) Verify GPU + CUDA
```bash
nvidia-smi
nvcc --version || sudo apt-get install -y nvidia-cuda-toolkit
```

## 2) Install build tools
```bash
sudo apt-get update -y
sudo apt-get install -y build-essential cmake git pkg-config
```

## 3) Clone llama.cpp
```bash
cd /opt
sudo git clone https://github.com/ggerganov/llama.cpp.git
sudo chown -R localadmin:localadmin /opt/llama.cpp
```

## 4) Build (CUDA, sm_86)
```bash
cd /opt/llama.cpp
mkdir -p build && cd build
cmake .. \
  -DLLAMA_CUDA=ON \
  -DCMAKE_CUDA_ARCHITECTURES=86 \
  -DLLAMA_NATIVE=ON \
  -DCMAKE_BUILD_TYPE=Release
cmake --build . -j$(nproc)
```

## 5) Test build
```bash
/opt/llama.cpp/build/bin/llama-cli -h
```

---

## 6) Create service user
```bash
sudo useradd -r -m -s /usr/sbin/nologin llamacpp
sudo mkdir -p /opt/models/gguf /etc/llamacpp
sudo chown llamacpp:llamacpp /opt/models/gguf
```

## 7) Create environment file
```bash
sudo tee /etc/llamacpp/llamacpp.env << 'EOF'
MODEL_PATH=/opt/models/gguf/qwen3.5:latest.gguf
MMPROJ_PATH=/opt/models/gguf/mmproj-F16.gguf
PORT=11434
HOST=0.0.0.0
CTX_SIZE=262144
PARALLEL=4
BATCH_SIZE=128
UNBOUNDED_BATCH=32
EOF
```

## 8) Create systemd service
```bash
sudo tee /etc/systemd/system/llamacpp.service << 'EOF'
[Unit]
Description=llama.cpp server
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=llamacpp
Group=llamacpp
EnvironmentFile=/etc/llamacpp/llamacpp.env
WorkingDirectory=/opt/llama.cpp/build
ExecStart=/opt/llama.cpp/build/bin/llama-server \
  -m ${MODEL_PATH} \
  --mmproj ${MMPROJ_PATH} \
  --host ${HOST} \
  --port ${PORT} \
  --ctx-size ${CTX_SIZE} \
  --context-shift \
  -np ${PARALLEL} \
  -fa on \
  -b ${BATCH_SIZE} \
  -ub ${UNBOUNDED_BATCH} \
  --cache-type-k q4_0 \
  --cache-type-v q4_0
Restart=on-failure
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
```

## 9) Enable and start
```bash
sudo systemctl daemon-reload
sudo systemctl enable llamacpp
sudo systemctl start llamacpp
```

## 10) Verify
```bash
systemctl status llamacpp
curl http://localhost:11434/v1/models
```

---

## Model Download Script

Create `~/hugpull.sh`:
```bash
#!/usr/bin/env bash
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $(basename "$0") <URL-to-GGUF>" >&2
  exit 1
fi

URL="$1"
FILENAME=$(basename "${URL%%\?*}")
mkdir -p /opt/models/gguf

if command -v wget >/dev/null 2>&1; then
  wget -O "/opt/models/gguf/${FILENAME}" "$URL"
elif command -v curl >/dev/null 2>&1; then
  curl -L -o "/opt/models/gguf/${FILENAME}" "$URL"
else
  echo "Error: wget or curl is required." >&2
  exit 2
fi

echo "Downloaded to /opt/models/gguf/${FILENAME}"
```

Usage:
```bash
chmod +x ~/hugpull.sh
./hugpull.sh <URL-to-GGUF>
```

---

## Configuration Reference

### Current Setup
| Setting | Value |
|---------|-------|
| Model | Qwen3.5-27B Q4_K_M |
| Multimodal | mmproj-F16.gguf |
| Port | 11434 |
| Context Size | 262144 (256K) |
| Parallel Requests | 4 |
| Batch Size | 128 |
| Unbounded Batch | 32 |
| Cache Types | q4_0 (both K and V) |

### Key Flags
| Flag | Purpose |
|------|--------|
| `--context-shift` | Dynamic context window management |
| `-fa on` | Flash attention (faster inference) |
| `--cache-type-k q4_0` | KV cache K quantization (VRAM savings) |
| `--cache-type-v q4_0` | KV cache V quantization (VRAM savings) |

---

## Notes
- `sm_86` matches RTX 3090 (Ampere).
- Port 11434 is Ollama-compatible API port.
- q4_0 cache types save significant VRAM on 27B models.
- Service runs as `llamacpp` user (no login, minimal privileges).

## Troubleshooting
```bash
# Check service logs
sudo journalctl -u llamacpp -f

# Check GPU usage
nvidia-smi

# Test API
http://localhost:11434/v1/completions
```

## Rollback
```bash
sudo systemctl stop llamacpp
sudo systemctl disable llamacpp
sudo rm -f /etc/systemd/system/llamacpp.service
sudo rm -rf /opt/llama.cpp /opt/models/gguf /etc/llamacpp
sudo userdel -r llamacpp 2>/dev/null || true
```
