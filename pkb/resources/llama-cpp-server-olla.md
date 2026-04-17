# llama.cpp Server — Olla VM (Proxmox LXC on usm2)

## Overview

Local LLM inference server running on the **olla VM** (172.16.254.231) via llama.cpp's `llama-server`. Serves OpenAI-compatible API on port 11434 for both OpenClaw and Hermes.

**Note:** usm1 removed from network (2026-04-04). **olla** is VM 101 running on **usm2** Proxmox host.

## Architecture

- **Host:** usm2 Proxmox server (172.16.254.231)
- **VM:** olla (VM 101) running on usm2
- **Hardware:** NVIDIA RTX 3090 (24GB VRAM), 16 CPU threads
- **Binary:** `/opt/llama.cpp/build/bin/llama-server`
- **Source:** `/opt/llama.cpp` (git clone of ggml-org/llama.cpp)
- **Models:** `/opt/models/gguf/` (active model symlinked to `llama.gguf`)
- **Port:** 11434 (OpenAI-compatible API)
- **Service:** `llama-server.service`
- **Kernel:** 6.17.9-1 (newer than usm1's 6.5.x)

## Consumers

| Service | Base URL | API Key |
|---------|----------|---------|
| OpenClaw (Sam) | `http://olla:11434/v1` | `local` |
| Hermes | `http://olla:11434/v1` | `local` |

## Supported Model Architectures

Updated as llama.cpp is rebuilt:

- **Qwen3.5** — Primary model family (27B, 35B variants)
- **Gemma 4** — Added 2026-04-02 (build 8641+)
- **LLaMA 3.x** — Supported
- **Mistral/Mixtral** — Supported
- **DeepSeek** — Supported
- Full list: see llama.cpp source `src/models/`

## Key Configuration

```ini
# /etc/systemd/system/llama-server.service
--ctx-size 262144    # 262k context window
-np 1                # 1 parallel slot
-fa on               # Flash attention enabled
-b 1024              # Batch size
-ub 512              # Micro-batch size
--threads 16         # CPU threads
--cache-type-k q4_0  # KV cache quantization (key)
--cache-type-v q4_0  # KV cache quantization (value)
--jinja              # Jinja2 chat templates
--reasoning off      # Disable reasoning mode
```

## Common Operations

### Switch Model
```bash
ln -sf /opt/models/gguf/NEW_MODEL.gguf /opt/models/gguf/llama.gguf
sudo systemctl restart llama-server
```

### Rebuild for New Architecture
See playbook: `ITIL/playbooks/llama-cpp-rebuild-upgrade.md`

### Check Version
```bash
/opt/llama.cpp/build/bin/llama-server --version
```

### Monitor Performance
```bash
journalctl -u llama-server -f  # Live logs
# Look for: tokens/sec prompt eval, tokens/sec generation
```

## Constraints

- ⚠️ **usm1 host:** NEVER update kernel on usm1 (NVIDIA vGPU driver dependency on 6.5.x)
- **olla VM kernel:** Running 6.17.9-1 (newer than usm1)
- 24GB VRAM limits model size — typically Q4 quants of 27B-35B models
- Single slot (`-np 1`) means sequential request handling
- No HTTPS (OpenSSL not installed — internal network only)

## Host/VM History

| Date | Event |
|------|-------|
| 2026-03-05 | usm2 verified via SSH (VM 101 running) |
| 2026-03-05 | usm2 kernel confirmed 6.17.9-1 (newer than usm1) |
| 2026-04-04 | usm1 removed from network |
| 2026-04-04 | Olla VM (VM 101) verified on usm2 |

## Build History

| Date | Build | Commit | Reason |
|------|-------|--------|--------|
| 2026-03-19 | 8430 | 4065c1a3a | Qwen3.5 support, server sampling defaults |
| 2026-04-02 | 8641 | 5208e2d5b | Gemma 4 architecture, 504 files changed |

## Links

- Playbook: [[llama-cpp-rebuild-upgrade]]
- ITIL: [[llama-server-failures]]
- Related: [[olla-vm-rebuild]]
- Memory: [[MEMORY.md]] (usm1 removed, usm2/olla active)
