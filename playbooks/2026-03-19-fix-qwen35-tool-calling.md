## [PLAYBOOK-20260319-001] Fix qwen3.5 Tool Calling on olla

**Date**: 2026-03-19
**Author**: Sam (ocg)
**Status**: active
**Complexity**: medium
**Time**: 30-60 minutes

---

## Overview

llama-server on olla lacks `--jinja` flag, causing Qwen 3.5 to emit tool call XML as plain text instead of structured function calls. Fix requires recompiling llama.cpp (latest) and updating the service config.

---

## Prerequisites

- [ ] SSH access to olla (`ssh localadmin@olla`)
- [ ] CUDA toolkit installed on olla (for NVIDIA vGPU)
- [ ] sudo access on olla for systemctl operations
- [ ] ⚠️ **DO NOT update kernel on usm1** — NVIDIA vGPU breaks above 6.5.x

---

## Step-by-Step Instructions

### Phase 1: Recompile llama.cpp (latest)

#### Step 1: Connect to olla

```bash
ssh localadmin@olla
```

#### Step 2: Pull latest llama.cpp

```bash
cd /opt/llama.cpp
git pull origin master
```

#### Step 3: Build with CUDA support

```bash
cmake -B build -DGGML_CUDA=ON -DCMAKE_CUDA_ARCHITECTURES=native
cmake --build build --config Release -j$(nproc)
```

#### Step 4: Verify new binary

```bash
./build/bin/llama-server --version
```

---

### Phase 2: Update llama-server.service

#### Step 5: Edit the service file

```bash
sudo nano /etc/systemd/system/llama-server.service
```

Updated ExecStart line:

```
ExecStart=/opt/llama.cpp/build/bin/llama-server \
  -m /opt/models/gguf/qwen3.5:latest.gguf \
  --mmproj /opt/models/gguf/mmproj-F16.gguf \
  --host 172.16.254.100 --port 11434 \
  --ctx-size 131072 --jinja \
  --context-shift --slot-idle-timeout 600 \
  --slot-prefill-max 4 --slot-max-queue 10 \
  --num-predict -1
```

Key changes:
- Added `--jinja` flag (enables Jinja2 chat template processing for tool calls)
- Removed `--stop` flag (let template handle stop tokens)

---

### Phase 3: Restart & Test

#### Step 6: Reload and restart

```bash
sudo systemctl daemon-reload
sudo systemctl restart llama-server
sudo systemctl status llama-server
```

#### Step 7: Test tool calling

From ocg, switch to qwen3.5 and run a simple tool call (e.g., `ls /tmp`).

---

## Verification

```bash
# On olla - confirm service running
sudo systemctl status llama-server

# On olla - check logs for jinja template loading
journalctl -u llama-server --no-pager -n 50 | grep -i "jinja\|template\|tool"
```

**Success Criteria:**
- [ ] llama-server running with `--jinja` flag
- [ ] Tool calls from OpenClaw on qwen3.5 actually execute (not emitted as text)
- [ ] No regression in normal chat responses

---

## Troubleshooting

### Issue: Tool calls still emit as text after --jinja

**Symptom:** Same behavior as before

**Fix:**
Try explicit chat template:
```
--chat-template chatml
```
Or check if GGUF metadata has the correct template:
```bash
python3 -c "from gguf import GGUFReader; r = GGUFReader('/opt/models/gguf/qwen3.5:latest.gguf'); [print(f.name, f.data[:200]) for f in r.fields if 'template' in f.name.lower()]"
```

### Issue: CUDA build fails

**Symptom:** cmake errors about CUDA

**Fix:**
```bash
# Check CUDA is available
nvidia-smi
nvcc --version
# Ensure cmake can find CUDA
export CUDA_HOME=/usr/local/cuda
```

### Issue: Service won't start after update

**Symptom:** llama-server crashes on startup

**Fix:**
```bash
# Check logs
journalctl -u llama-server --no-pager -n 100
# Roll back to previous binary if needed
git log --oneline -5  # find previous commit
git checkout <previous-commit>
cmake --build build --config Release -j$(nproc)
```

---

## References

- SIP Entry: `ERR-20260319-001` in `.learnings/ERRORS.md`
- llama.cpp Jinja docs: https://github.com/ggerganov/llama.cpp/blob/master/docs/templates.md
- Qwen tool calling format: ChatML with `<tool_call>` blocks
- Kernel constraint: MEMORY.md (usm1 kernel pinned to 6.5.x)

---

*Last Updated: 2026-03-19 | Author: Sam*
