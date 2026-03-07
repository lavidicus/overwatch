# llama-server Failures

## Overview

Playbook for diagnosing and recovering llama-server issues, including context window problems, model loading failures, and performance issues.

---

## 1) Service Status Check

### Check Service Status

```bash
# Check llama-server service
systemctl status llama-server

# Check if process is running
ps aux | grep llama-server

# Check listening port
ss -tlnp | grep 8080
netstat -tlnp | grep 8080
```

### Test API Endpoint

```bash
# Test health endpoint
curl http://localhost:8080/health

# List available models
curl http://localhost:8080/v1/models

# Test completion endpoint
curl http://localhost:8080/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "qwen2.5:7b", "prompt": "Hello", "max_tokens": 10}'
```

---

## 2) Common Failure Scenarios

### Scenario A: Service Not Running

```bash
# Start service
sudo systemctl start llama-server

# Check for errors
sudo journalctl -u llama-server --since "10 minutes ago"

# Check service configuration
cat /etc/systemd/system/llama-server.service
```

### Scenario B: Model Loading Failure

**Symptoms:**
- "Failed to load model"
- "Out of memory"
- Service crashes on startup

**Diagnosis:**

```bash
# Check available RAM
free -h

# Check available VRAM (NVIDIA)
nvidia-smi

# Check model file size
ls -lh /path/to/model.gguf

# Check service logs for errors
sudo journalctl -u llama-server | grep -i error
```

**Resolution:**

```bash
# Reduce context size
# Edit /etc/systemd/system/llama-server.service
ExecStart=/usr/bin/llama-server \
  --ctx-size 65536 \
  ...

# Reduce number of layers offload to GPU
ExecStart=/usr/bin/llama-server \
  --n-gpu-layers 20 \
  ...

# Apply changes
sudo systemctl daemon-reload
sudo systemctl restart llama-server
```

### Scenario C: Context Window Overflow

**Symptoms:**
- "Context size exceeded"
- "Prompt too large"
- Request rejected

**Diagnosis:**

```bash
# Check current context size
sudo cat /etc/systemd/system/llama-server.service | grep ctx-size

# Check active context usage
curl http://localhost:8080/health | jq .context_usage
```

**Resolution:**

```bash
# Update context size
# Edit /etc/systemd/system/llama-server.service

# Recommended sizes:
# --ctx-size 65536    (64K) - Default
# --ctx-size 131072   (128K) - Medium
# --ctx-size 262144   (256K) - Large
# --ctx-size 524288   (512K) - Extra large

ExecStart=/usr/bin/llama-server \
  --ctx-size 262144 \
  ...

# Apply changes
sudo systemctl daemon-reload
sudo systemctl restart llama-server
```

---

## 3) Configuration Management

### View Current Configuration

```bash
# View service file
cat /etc/systemd/system/llama-server.service

# Parse key settings
grep -E "ctx-size|n-gpu-layers|batch-size" /etc/systemd/system/llama-server.service
```

### Recommended Configuration

**For 16GB RAM, No GPU:**

```ini
ExecStart=/usr/bin/llama-server \
  --model /path/to/qwen2.5-7b.gguf \
  --ctx-size 32768 \
  --batch-size 512 \
  --threads 8
```

**For 32GB RAM, No GPU:**

```ini
ExecStart=/usr/bin/llama-server \
  --model /path/to/qwen2.5-14b.gguf \
  --ctx-size 65536 \
  --batch-size 1024 \
  --threads 16
```

**For 64GB RAM + NVIDIA GPU:**

```ini
ExecStart=/usr/bin/llama-server \
  --model /path/to/qwen2.5-32b.gguf \
  --ctx-size 131072 \
  --n-gpu-layers 50 \
  --batch-size 2048 \
  --flash-attn
```

### Apply Configuration Changes

```bash
# Edit service file
sudo vim /etc/systemd/system/llama-server.service

# Reload systemd
sudo systemctl daemon-reload

# Restart service
sudo systemctl restart llama-server

# Verify new configuration
sudo journalctl -u llama-server --since "1 minute ago"
```

---

## 4) Performance Tuning

### Check Resource Usage

```bash
# CPU usage
htop

# Memory usage
free -h

# GPU usage (NVIDIA)
nvidia-smi

# GPU usage (AMD)
rocm-smi
```

### Optimize for Throughput

```ini
# Increase batch size
--batch-size 4096

# Enable flash attention
--flash-attn

# Increase parallel requests
--parallel 8
```

### Optimize for Low Latency

```ini
# Reduce batch size
--batch-size 512

# Use smaller model
--model /path/to/qwen2.5-7b.gguf

# Reduce context size
--ctx-size 16384
```

---

## 5) Model Management

### List Available Models

```bash
# Find GGUF models
find /path/to/models -name "*.gguf" -ls

# Check model file integrity
md5sum /path/to/model.gguf
```

### Switch Models

```bash
# Edit service file
sudo vim /etc/systemd/system/llama-server.service

# Change model path
--model /path/to/new-model.gguf

# Restart service
sudo systemctl daemon-reload
sudo systemctl restart llama-server
```

### Download Models

```bash
# Using ollama
ollama pull qwen2.5:7b

# Find downloaded model
find ~/.ollama -name "*.gguf"

# Or download directly from HuggingFace
wget https://huggingface.co/TheBloke/Qwen2.5-7B-Instruct-GGUF/resolve/main/qwen2.5-7b-instruct.Q4_K_M.gguf
```

---

## 6) Context Window Roll-Over Fix

### Issue

Context window fails to roll when approaching limit; llama-server rejects prompts >65536 tokens.

### Root Cause

Client-side accumulation — OpenClaw builds prompts to 66k+ tokens before sending, exceeding server's `--ctx-size 65535`. SWA checkpoints cycling fine but compaction doesn't fire early enough.

### Fixes Applied

**Server-side:**

```ini
# /etc/systemd/system/llama-server.service
ExecStart=/usr/bin/llama-server \
  --ctx-size 131072 \
  ...
```

**Client-side:**

```json
// ~/.openclaw/openclaw.json
{
  "reserveTokens": 40000
}
```

### Deploy Fix

```bash
# Update llama-server service
sudo vim /etc/systemd/system/llama-server.service

# Apply changes
sudo systemctl daemon-reload
sudo systemctl restart llama-server

# Update OpenClaw config
vim ~/.openclaw/openclaw.json

# Restart OpenClaw gateway
openclaw gateway restart
```

---

## 7) Vision Model Support

### Enable Vision Support

```ini
# /etc/systemd/system/llama-server.service
ExecStart=/usr/bin/llama-server \
  --model /path/to/llava-v1.6-7b.gguf \
  --ctx-size 131072 \
  --flash-attn \
  ...
```

### Test Vision Capabilities

```bash
# Check if model supports vision
curl http://localhost:8080/v1/models | jq '.[] | select(.id | contains("vision"))'
```

---

## 8) Monitoring & Alerting

### Health Check Endpoint

```bash
# Check server health
curl http://localhost:8080/health

# Check model info
curl http://localhost:8080/v1/models
```

### Log Monitoring

```bash
# Follow logs in real-time
sudo journalctl -u llama-server -f

# Check for errors
sudo journalctl -u llama-server | grep -i error | tail -20

# Check for warnings
sudo journalctl -u llama-server | grep -i warn | tail -20
```

---

## 9) Backup and Recovery

### Backup Model Files

```bash
# Backup models
tar czf /backup/llama-models-$(date +%Y%m%d).tar.gz /path/to/models/

# Backup configuration
cp /etc/systemd/system/llama-server.service /backup/llama-server.service.backup
```

### Restore from Backup

```bash
# Restore models
tar xzf /backup/llama-models-20260307.tar.gz -C /

# Restore configuration
cp /backup/llama-server.service.backup /etc/systemd/system/llama-server.service

# Restart service
sudo systemctl daemon-reload
sudo systemctl restart llama-server
```

---

## Related PKB Guides

- [[pkb/areas/System guides/Linux Operating System/]]
- [[pkb/resources/Concepts/System Administration Knowledge Base]]

---

*Created: 2026-03-07 | Priority: P1 | Category: Incident*
