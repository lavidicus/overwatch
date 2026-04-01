# vLLM Installation Plan for Olla Provider (RTX 3090)

**Target System:** Linux Proxmox LXC container `ocg`  
**GPU:** NVIDIA RTX 3090 (24GB GDDR6X)  
**Model:** Qwen3.5-27B (GPTQ-Int4 quantization)  
**Date:** 2026-03-30

---

## ⚠️ VRAM Reality Check

Qwen3.5-27B natively supports 262,144 token context. However, on a **single RTX 3090 (24GB)**:

| Quantization | Model Size | Max Context (approx) | Notes |
|-------------|-----------|---------------------|-------|
| INT4 (GPTQ) | ~16GB | **~100k tokens** | Realistic single-GPU limit |
| INT4 (AWQ-BF16-INT4) | ~16GB | **~100k tokens** | Best quality INT4 |
| INT8 | ~27GB | ❌ Won't fit | Exceeds 24GB |
| FP16 | ~54GB | ❌ Won't fit | Exceeds 24GB |

**To reach 262k context you would need 2× RTX 3090 with tensor parallelism (48GB total).**

The service file below sets `--max-model-len 262144` as requested. vLLM will either:
- Accept it if swap-space + chunked prefill can compensate, or
- Error on startup saying it needs more VRAM — in which case lower to `131072` or `98304`

---

## 📋 Installation Steps

### 1. Install System Dependencies
```bash
sudo apt update
sudo apt install -y python3-venv python3-pip git cmake build-essential libffi-dev
```

### 2. Verify CUDA is Available
```bash
# RTX 3090 requires CUDA 11.x or 12.x
nvidia-smi
nvcc --version

# If CUDA not installed:
# Follow https://developer.nvidia.com/cuda-downloads for your distro
```

### 3. Create Python Virtual Environment
```bash
sudo mkdir -p /opt/vllm
sudo chown localadmin:localadmin /opt/vllm
cd /opt/vllm
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
```

### 4. Install vLLM
```bash
source /opt/vllm/venv/bin/activate
pip install vllm
```

### 5. Download Qwen3.5-27B GPTQ-Int4 Model
```bash
# Create model directory
sudo mkdir -p /opt/models/vllm
sudo chown localadmin:localadmin /opt/models/vllm

# Install huggingface CLI
pip install huggingface-hub[cli]

# Download the official Qwen GPTQ-Int4 quantization (vLLM compatible)
huggingface-cli download Qwen/Qwen3.5-27B-GPTQ-Int4 \
    --local-dir /opt/models/vllm/Qwen3.5-27B-GPTQ-Int4

# NOTE: This is ~16GB. The download may take a while.
```

### 6. Verify Model Download
```bash
ls -la /opt/models/vllm/Qwen3.5-27B-GPTQ-Int4/
# Should contain:
# - config.json
# - model*.safetensors
# - tokenizer.json
# - tokenizer_config.json
# - quantize_config.json  (GPTQ metadata)
```

### 7. Install Systemd Service
```bash
sudo cp /home/localadmin/.openclaw/workspace/vllm-qwen-3090.service \
    /etc/systemd/system/vllm-qwen-3090.service
sudo systemctl daemon-reload
```

### 8. Test Before Enabling
```bash
# Start and watch logs for OOM or errors
sudo systemctl start vllm-qwen-3090.service
journalctl -u vllm-qwen-3090.service -f

# If OOM on 262144 context, edit service and reduce --max-model-len to 131072 or 98304
```

### 9. Enable on Boot
```bash
sudo systemctl enable vllm-qwen-3090.service
```

---

## 🔍 Verification

```bash
# Check service
sudo systemctl status vllm-qwen-3090.service

# Check GPU usage
nvidia-smi

# Test the endpoint (OpenAI-compatible)
curl http://172.16.254.100:8000/v1/models

curl http://172.16.254.100:8000/v1/completions \
    -H "Content-Type: application/json" \
    -d '{
        "model": "qwen3.5-27b",
        "prompt": "Hello, how are you?",
        "max_tokens": 100
    }'

# Monitor logs
journalctl -u vllm-qwen-3090.service -f
```

---

## 📊 Expected Performance (Single RTX 3090)

- **Tokens/sec (decode):** ~50-80 tok/s (single user)
- **Tokens/sec (prefill):** ~800-1200 tok/s
- **VRAM Usage:** ~22-23GB (model + KV cache)
- **Realistic Context:** ~100k tokens (may need to reduce from 262k)
- **First Token Latency:** ~100-300ms depending on prompt length

---

## 🚨 Important Notes

1. **Model format:** vLLM uses HuggingFace format (GPTQ/AWQ safetensors). This is a DIFFERENT model file than llama.cpp's GGUF. You need both downloaded separately.
2. **Quantization flag:** Uses `--quantization gptq` for Qwen/Qwen3.5-27B-GPTQ-Int4. Do NOT use `--quantization awq` with a GPTQ model.
3. **262k context:** Will likely OOM on single 3090. Start with it and be prepared to reduce.
4. **Port/host:** Service binds to `172.16.254.100:8000` to match your network (same IP as llama-server).
5. **No LoRA by default:** Removed `--enable-lora` to save VRAM for context.
6. **Swap space:** Set to 16GB to help with context overflow to system RAM.
