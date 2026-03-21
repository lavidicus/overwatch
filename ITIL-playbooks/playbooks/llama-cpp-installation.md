# llama.cpp Installation & Service Setup (CUDA) — Playbook

**Category:** Change Management  
**Priority:** P2  
**Scope:** Olla VM (Ubuntu 24.04, RTX 3090)  
**Last Updated:** 2026-03-07

## Goal
Install and build `llama.cpp` with CUDA acceleration, create a systemd service, and configure it for production use.

---

## Preconditions
- Olla VM up and reachable (172.16.254.100)
- NVIDIA driver installed (535+)
- CUDA toolkit installed
- Disk space available in `/opt` and `/opt/models/gguf`

---

## Procedure

### 1) Verify GPU/CUDA
```bash
nvidia-smi
nvcc --version || sudo apt-get install -y nvidia-cuda-toolkit
```

### 2) Install build deps
```bash
sudo apt-get update -y
sudo apt-get install -y build-essential cmake git pkg-config
```

### 3) Clone repo
```bash
cd /opt
sudo git clone https://github.com/ggerganov/llama.cpp.git
sudo chown -R localadmin:localadmin /opt/llama.cpp
```

### 4) Build with CUDA (sm_86)
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

### 5) Validate build
```bash
/opt/llama.cpp/build/bin/llama-cli -h
```

### 6) Create service user and directories
```bash
sudo useradd -r -m -s /usr/sbin/nologin llamacpp
sudo mkdir -p /opt/models/gguf /etc/llamacpp
sudo chown llamacpp:llamacpp /opt/models/gguf
```

### 7) Create environment file
```bash
sudo tee /etc/llamacpp/llamacpp.env << 'EOF'
# llama.cpp server environment
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

### 8) Create systemd service
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

### 9) Enable and start service
```bash
sudo systemctl daemon-reload
sudo systemctl enable llamacpp
sudo systemctl start llamacpp
```

---

## Verification
- [ ] `nvidia-smi` shows RTX 3090
- [ ] `llama-cli -h` runs
- [ ] No CMake errors
- [ ] `systemctl status llamacpp` shows active
- [ ] `curl http://localhost:11434/v1/models` returns response

---

## Rollback
```bash
sudo systemctl stop llamacpp
sudo systemctl disable llamacpp
sudo rm -f /etc/systemd/system/llamacpp.service
sudo rm -rf /opt/llama.cpp /opt/models/gguf /etc/llamacpp
sudo userdel -r llamacpp 2>/dev/null || true
```

---

## Configuration Notes

### Model Configuration
- **Model:** Qwen3.5-27B (Q4_K_M quantized)
- **Multimodal:** Vision support via mmproj-F16.gguf
- **Storage:** `/opt/models/gguf/`

### Key Flags Explained
| Flag | Value | Purpose |
|------|-------|--------|
| `--ctx-size` | 262144 | 256K context window |
| `--context-shift` | (enabled) | Dynamic context management |
| `-np` | 4 | 4 parallel requests |
| `-fa on` | (enabled) | Flash attention |
| `-b` | 128 | Batch size for generation |
| `-ub` | 32 | Unbounded batch size |
| `--cache-type-k q4_0` | q4_0 | KV cache K quantization (VRAM savings) |
| `--cache-type-v q4_0` | q4_0 | KV cache V quantization (VRAM savings) |

### Service User
- **User:** `llamacpp` (system user, no login)
- **Purpose:** Run service with minimal privileges

### Port
- **Default:** 11434 (Ollama-compatible API)
- **Binding:** 0.0.0.0 (accessible from LAN)

---

## Model Download Script

Create `/home/localadmin/hugpull.sh`:
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
chmod +x /home/localadmin/hugpull.sh
./hugpull.sh <URL-to-GGUF>
```

---

## Notes
- Use `-DCMAKE_CUDA_ARCHITECTURES=86` for RTX 3090 (Ampere).
- Build uses CMake (preferred upstream).
- q4_0 cache types save significant VRAM on 27B models.
- Port 11434 provides Ollama-compatible API compatibility.
