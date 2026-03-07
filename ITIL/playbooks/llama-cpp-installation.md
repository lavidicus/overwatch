# llama.cpp Installation (CUDA) — Playbook

**Category:** Change Management
**Priority:** P2
**Scope:** Olla VM (Ubuntu 24.04)

## Goal
Install and build `llama.cpp` with CUDA acceleration (RTX 3090, sm_86) on Olla.

---

## Preconditions
- Olla VM up and reachable
- NVIDIA driver installed (535)
- CUDA toolkit installed
- Disk space available in `/opt`

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

### 5) Validate
```bash
/opt/llama.cpp/build/bin/llama-cli -h
```

---

## Verification
- [ ] `nvidia-smi` shows RTX 3090
- [ ] `llama-cli -h` runs
- [ ] No CMake errors

---

## Rollback
```bash
sudo rm -rf /opt/llama.cpp
```

---

## Notes
- Use `-DCMAKE_CUDA_ARCHITECTURES=86` for RTX 3090 (Ampere).
- Build uses CMake (preferred upstream).
