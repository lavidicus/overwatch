# Playbook: llama.cpp Rebuild & Upgrade

**Category:** Change Management
**Priority:** P3 (Standard Change)
**Last Updated:** 2026-04-02
**Host:** olla (172.16.254.231 / olla.9xc.local)

## When to Use

- New model architecture not recognized (e.g., `unknown model architecture: 'gemma4'`)
- Performance improvements needed from upstream
- Security patches in llama.cpp
- New features required (e.g., new quantization types, flash attention improvements)

## Prerequisites

- SSH access to `olla` as `localadmin`
- `sudo` access for service restart
- CUDA toolkit installed (currently CUDA on RTX 3090, compute capability 8.6)
- ~10 minutes downtime for build + restart

## Impact

- **Downtime:** Model serving unavailable during build (~8-12 min) + restart (~5 sec)
- **Affected Services:** OpenClaw (llamacpp provider), Hermes (custom provider via olla)
- **Rollback:** Previous binary still at `/opt/llama.cpp/build/bin/llama-server` until overwritten

## Procedure

### 1. Stop the Service

```bash
ssh localadmin@olla "sudo systemctl stop llama-server"
```

### 2. Fix Permissions (if needed)

```bash
ssh localadmin@olla "sudo chown -R localadmin:localadmin /opt/llama.cpp"
```

### 3. Pull Latest Source

```bash
ssh localadmin@olla "cd /opt/llama.cpp && git pull"
```

### 4. Configure CMake

```bash
ssh localadmin@olla "cd /opt/llama.cpp && cmake -B build -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=86"
```

**Key flags:**
- `DGGML_CUDA=ON` — Enable CUDA backend
- `CMAKE_CUDA_ARCHITECTURES=86` — RTX 3090 (Ampere)
- Add `-DGGML_CUDA_F16=ON` for FP16 CUDA (optional, may improve perf)

### 5. Build

```bash
ssh localadmin@olla "cd /opt/llama.cpp && cmake --build build --config Release -j$(nproc)"
```

Build takes ~8-12 minutes with 16 threads.

### 6. Verify Build

```bash
ssh localadmin@olla "/opt/llama.cpp/build/bin/llama-server --version"
```

### 7. Restart Service

```bash
ssh localadmin@olla "sudo systemctl restart llama-server && sleep 3 && systemctl is-active llama-server"
```

### 8. Verify Model Loading

```bash
ssh localadmin@olla "journalctl -u llama-server --no-pager -n 20 --since '1 min ago'"
```

Look for: `model loaded successfully`, context size, and GPU layer offloading.

## Service Configuration

**Unit file:** `/etc/systemd/system/llama-server.service`

**Current ExecStart:**
```
/opt/llama.cpp/build/bin/llama-server \
  -m /opt/models/gguf/llama.gguf \
  --host 0.0.0.0 --port 11434 \
  --ctx-size 262144 -np 1 -fa on \
  -b 1024 -ub 512 --threads 16 \
  --cache-type-k q4_0 --cache-type-v q4_0 \
  --jinja --reasoning off --reasoning-budget 0
```

**Working configs (commented in unit file):**
- Qwen3.5:35B-4Q (with mmproj)
- Qwen3.5:27B-4Q (with mmproj)

## Model Symlink

The model file is always symlinked at `/opt/models/gguf/llama.gguf`. To switch models:

```bash
ssh localadmin@olla "ln -sf /opt/models/gguf/ACTUAL_MODEL.gguf /opt/models/gguf/llama.gguf"
ssh localadmin@olla "sudo systemctl restart llama-server"
```

## Rollback

If the new build fails:
1. Check `git log --oneline -5` for recent commits
2. `git checkout <previous-commit-hash>`
3. Rebuild with same cmake flags
4. Restart service

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `unknown model architecture` | Build too old | Pull & rebuild |
| `Permission denied` on git pull | Root owns files | `sudo chown -R localadmin:localadmin /opt/llama.cpp` |
| CUDA OOM | Model too large for 24GB VRAM | Use smaller quant or reduce ctx-size |
| `OpenSSL not found` warning | Missing libssl-dev | Non-critical, HTTPS disabled in server |
| Build fails on CUDA files | CUDA toolkit mismatch | Check `nvcc --version` matches cmake config |

## History

| Date | Build | Reason |
|------|-------|--------|
| 2026-03-19 | 8430 (4065c1a3a) | Qwen3.5 support |
| 2026-04-02 | 8641 (5208e2d5b) | Gemma 4 architecture support |
