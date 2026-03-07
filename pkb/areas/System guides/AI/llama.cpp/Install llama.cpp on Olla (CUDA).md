# Install llama.cpp on Olla (CUDA, sm_86)

**Target:** Olla VM (Ubuntu 24.04) with RTX 3090

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

## 5) Test
```bash
/opt/llama.cpp/build/bin/llama-cli -h
```

---

### Notes
- `sm_86` matches RTX 3090 (Ampere).
- Keep GPU secondary display (x‑vga=0) so console stays visible.
- If CUDA toolkit is missing, install via `nvidia-cuda-toolkit`.
