# 🧑‍💼 Sam's Qwen3.5:latest Playbook

**Version:** 2026.03.22  
**Model:** qwen3.5:latest (35B)  
**Host:** Olla (172.16.254.100)  
**Provider:** llama.cpp via Ollama-compatible API

---

## 🎯 Overview

Qwen3.5:latest is the primary model for Sam's operations. It's a **35B parameter model** optimized for:
- System administration & engineering tasks
- Code generation & debugging
- Project management & documentation
- Long-context reasoning (262k tokens)
- Multimodal input (text + images)

**Key Strengths:**
- ✅ 262k context window (262,144 tokens)
- ✅ Multimodal vision support
- ✅ Fast inference (~125 tokens/sec)
- ✅ Low latency for real-time tasks
- ✅ Bilingual (English + Chinese)

---

## 🔧 OpenClaw Configuration

### Model Provider Setup

**File:** `/home/localadmin/.openclaw/openclaw.json`

```json
{
  "models": {
    "mode": "merge",
    "providers": {
      "olla": {
        "baseUrl": "http://olla:11434/v1",
        "apiKey": "local",
        "api": "openai-completions",
        "models": [
          {
            "id": "qwen3.5:latest",
            "name": "qwen3.5:latest (Custom Provider)",
            "reasoning": false,
            "input": ["text", "image"],
            "cost": {
              "input": 0,
              "output": 0,
              "cacheRead": 0,
              "cacheWrite": 0
            },
            "contextWindow": 262144,
            "maxTokens": 8192
          }
        ]
      }
    }
  },
  "agents": {
    "defaults": {
      "model": {
        "primary": "olla/qwen3.5:latest",
        "fallbacks": [
          "github-copilot/gpt-5-mini",
          "github-copilot/claude-opus-4.6",
          "github-copilot/gpt-5.2-codex"
        ]
      },
      "models": {
        "olla/qwen3.5:latest": {
          "alias": "qwen3.5"
        }
      },
      "compaction": {
        "mode": "safeguard",
        "reserveTokens": 40000
      }
    }
  }
}
```

**Key Settings:**
- **Context Window:** 262,144 tokens (max)
- **Compaction:** Triggers at 40,000 tokens remaining
- **Fallback Models:** gpt-5-mini, claude-opus, gpt-5.2-codex
- **Cache Read/Write:** 0 (free tier)

---

## 🚀 Olla llama-server Configuration

**File:** `/etc/systemd/system/llama-server.service`

```ini
[Service]
ExecStart=/opt/llama.cpp/build/bin/llama-server \
  -m /opt/models/gguf/qwen3.5:latest.gguf \
  --mmproj /opt/models/gguf/mmproj-Qwen_Qwen3.5-35B-A3B-bf16.gguf \
  --host 0.0.0.0 \
  --port 11434 \
  --ctx-size 262144 \
  -np 1 \
  -fa on \
  -b 1024 \
  -ub 512 \
  --threads 16 \
  --cache-type-k q4_0 \
  --cache-type-v q4_0 \
  --jinja \
  --reasoning off \
  --reasoning-budget 0
```

### Parameter Breakdown

| Parameter | Value | Description |
|-----------|-------|-------------|
| `-m` | `/opt/models/gguf/qwen3.5:latest.gguf` | Model path (**35B quantized**) |
| `--mmproj` | `/opt/models/gguf/mmproj-Qwen_Qwen3.5-35B-A3B-bf16.gguf` | Vision encoder (multimodal) |
| `--host` | `0.0.0.0` | Listen on all interfaces |
| `--port` | `11434` | API port (Ollama-compatible) |
| `--ctx-size` | `262144` | Max context window |
| `-np` | `1` | Number of parallel requests |
| `-fa` | `on` | Flash attention enabled (faster) |
| `-b` | `1024` | Batch size |
| `-ub` | `512` | Unbatched context size |
| `--threads` | `16` | CPU threads |
| `--cache-type-k` | `q4_0` | KV cache quantization (4-bit) |
| `--cache-type-v` | `q4_0` | KV cache quantization (4-bit) |
| `--jinja` | `true` | Use Jinja2 chat template |
| `--reasoning` | `off` | Disable reasoning mode |
| `--reasoning-budget` | `0` | No reasoning budget limit |

### Alternative Configs (Commented)

**Config 2 (Chat optimized):**
```bash
--mmproj mmproj-F16.gguf \
--context-shift \
--temp 0.6 \
--top-p 0.95 \
--top-k 20 \
--chat-template chatml
```

**Config 3 (131k context):**
```bash
--ctx-size 131072 \
--temp 0 \
--top-p 1.0 \
--top-k 0
```

---

## 📊 Performance Benchmarks

**Current Performance (Olla host):**
- **Prompt Evaluation:** ~737 tokens/sec
- **Generation Speed:** ~94 tokens/sec
- **VRAM Usage:** ~13-15GB (24GB RTX 3090)
- **Context Window:** 262k tokens (max)
- **Response Latency:** <2 seconds for short prompts

**Optimized Settings:**
- Flash attention enabled → 2-3x faster inference
- KV cache quantized (q4_0) → 50% VRAM reduction
- 16 threads → Balanced CPU/GPU workload

---

## 🎨 Usage Patterns

### 1. **Text Generation**
```bash
curl http://localhost:11434/v1/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3.5:latest","prompt":"System architecture for microservices","max_tokens":2048}'
```

### 2. **Multimodal (Image + Text)**
```bash
curl http://localhost:11434/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model":"qwen3.5:latest",
    "messages":[
      {"role":"user","content":[
        {"type":"image","image_url":"data:image/jpeg;base64,..."},
        {"type":"text","text":"Describe this system architecture"}
      ]}
    ]
  }'
```

### 3. **Long Context Analysis**
```bash
curl http://localhost:11434/v1/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model":"qwen3.5:latest",
    "prompt":"<long_document_content>",
    "max_tokens":4096,
    "context_size":262144
  }'
```

---

## 🔧 Troubleshooting

### Issue: Context Window Overflow
**Symptom:** Parsing errors at position 1950+  
**Fix:** Increase `reserveTokens` in openclaw.json from 40000 to 50000

### Issue: Slow Inference
**Symptom:** <50 tokens/sec generation speed  
**Fix:** Enable flash attention (`-fa on`), check GPU utilization

### Issue: Memory Pressure
**Symptom:** OOM errors at 20GB+ VRAM  
**Fix:** Reduce batch size (`-b 512`), use lower quantization

### Issue: Vision Not Working
**Symptom:** Images ignored in prompts  
**Fix:** Ensure `--mmproj` points to correct vision encoder

---

## 📝 Daily Operations

### Morning Check
```bash
# Check service status
ssh localadmin@172.16.254.100 "systemctl status llama-server"

# Check GPU memory
ssh localadmin@172.16.254.100 "nvidia-smi | grep -A3 'GPU Memory'"

# Test API
curl http://localhost:11434/v1/completions -H "Content-Type: application/json" -d '{"model":"qwen3.5:latest","prompt":"test","max_tokens":10}'
```

### Weekly Maintenance
```bash
# Restart service (if needed)
ssh localadmin@172.16.254.100 "sudo systemctl restart llama-server"

# Check logs
ssh localadmin@172.16.254.100 "journalctl -u llama-server --since \"1 day ago\" | tail -50"
```

---

## 🎯 Best Practices

1. **Always use `--reasoning off`** for faster responses
2. **Enable flash attention** for 2-3x performance boost
3. **Keep reserveTokens at 40000** to avoid context overflow
4. **Monitor VRAM usage** - Qwen3.5 (35B) uses ~13-15GB
5. **Use q4_0 KV cache** for 50% VRAM savings
6. **Test with short prompts first** before long context

---

## 🔄 Model Switching

**Current:** Qwen3.5:latest (**35B**, multimodal)  
**Available Fallbacks:**
- `gpt-5-mini` (OpenAI)
- `claude-opus` (Anthropic)
- `gpt-5.2-codex` (GitHub Copilot)

**To switch models:**
```bash
# In OpenClaw config
/model <alias>  # e.g., /model codex, /model mini
```

---

## 📚 References

- **Qwen3.5 Documentation:** https://qwenlm.github.io/
- **llama.cpp Docs:** https://github.com/ggerganov/llama.cpp
- **Ollama API:** https://github.com/ollama/ollama/blob/main/docs/api.md
- **OpenClaw Config:** /home/localadmin/.openclaw/openclaw.json

---

*Last Updated: 2026-03-22*  
*Maintained by: Sam (operations butler AI)*
