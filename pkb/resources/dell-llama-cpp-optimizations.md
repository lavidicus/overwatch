# Dell Node (pve3090-111) — llama.cpp Inference Optimizations

**Author:** Sam 🧑‍💼 (OpenClaw)
**Date:** May 13, 2026
**Version:** 1.0
**Last Updated:** May 13, 2026 04:08 UTC
**Tags:** #gpu #llama-cpp #optimization #dell #pve3090 #cuda #qwen3.6

---

## 1. Hardware & Software Configuration

| Component | Detail |
|-----------|--------|
| **GPU** | 2× NVIDIA RTX 3090 (24GB each, 48GB total), compute cap 8.6 |
| **CPU** | Intel Xeon E5-2680 v4 @ 2.40GHz (16 cores, dual-socket NUMA) |
| **RAM** | 62GB (9.5GB used, 53GB available) |
| **Swap** | 8GB |
| **Driver** | NVIDIA 595.58.03, CUDA 13.2 |
| **Host** | `pve3090-111` (ssh user1@pve3090-111) |
| **Model** | Qwen3.6-35B-A3B-UD-Q8_K_XL.gguf (37GB) |
| **MMProj** | qwen3.6-35B/mmproj-F16.gguf (multimodal) |
| **llama.cpp** | Built with CUDA 13, GGML_CUDA_GRAPHS=ON, GGML_CUDA_FA=ON, GGML_CUDA_NCCL=ON |
| **Split Mode** | layer (default, pipelined across GPUs) |

### Current Service Config
```ini
ExecStart=/home/user1/llama.cpp/build/bin/llama-server \
  -m /opt/models/gguf/llamacpp.gguf \
  --mmproj /opt/models/gguf/mmproj.gguf \
  --host 0.0.0.0 --port 11434 \
  --ctx-size 131072 \
  --n-gpu-layers all \
  -b 256 -ub 256 \
  --temp 0.6 --top-p 0.95 --top-k 20 --min-p 0.00 \
  --threads 14 --threads-batch 14 \
  --cache-type-k q8_0 --cache-type-v q8_0 \
  --cache-ram 8192 \
  --jinja --reasoning off --reasoning-budget 0 \
  --metrics \
  -np 1 \
  --flash-attn on \
  -ts 10,12 \
  --spec-type mtp \
  --spec-draft-n-max 3
```

---

## 2. Optimization Catalog

### #1 — CUDA Graphs (Activation)
**Status:** Built-in (`GGML_CUDA_GRAPHS=ON`) but **not activated** at runtime.
**Impact:** 10–30% generation speedup by eliminating per-token kernel launch overhead.
**How:** Add `--cuda-graphs` (or `--graph` depending on version) to the service.
**Risk:** Low — may use slightly more VRAM for graph memory, but 48GB total vs 37GB model leaves headroom.

### #2 — Tensor-Parallel GPU Split
**Status:** Currently using `split-mode=layer` (pipelined) with `--n-gpu-layers all`.
**Impact:** `split-mode=tensor --tensor-split 0.5,0.5` parallelizes weight computation across both GPUs, reducing per-GPU memory pressure and potentially improving throughput for large models.
**How:** Change split mode and tensor split in service config.
**Risk:** Medium — tensor splitting can have higher inter-GPU communication overhead on PCIe (no NVLink). Benchmark needed.

### #3 — Remove Deprecated `--np 1`
**Status:** Legacy flag from Olla days, no longer needed.
**Impact:** Cleanliness — flag is deprecated/ignored in modern llama.cpp.
**How:** Simply remove it from the service config.
**Risk:** None.

### #4 — KV Cache Data Type Tuning
**Status:** Currently `--cache-type-k q8_0 --cache-type-v q8_0`.
**Impact:** Options:
- **f16:** Higher precision, slightly more VRAM (~+15% KV cache), better quality for long contexts
- **q8_0:** Current — good balance of speed/quality
- **q4_0:** Lower precision, less VRAM, faster but may hurt quality
**How:** Change `--cache-type-k` and `--cache-type-v` values.
**Risk:** Low — f16 will use more VRAM but 11GB+ headroom exists.

### #5 — NUMA Optimization
**Status:** Not tuned. Xeon E5-2680 v4 is dual-socket (2 NUMA nodes).
**Impact:** `--numa isolate` or `--numa numactl` binds threads to the correct NUMA node, reducing cross-socket memory latency (~5-15% improvement).
**How:** Add `--numa isolate` to service config.
**Risk:** Low — safest option. May need `--numactl` if numactl is installed.

### #6 — Speculative Decoding Tuning (Future)
**Status:** Currently MTP with `--spec-draft-n-max 3`.
**Potential:** Increase to `--spec-draft-n-max 5` or `8` for 2-3x throughput if acceptance rate holds. Also try `--spec-draft-p-min 0.5`.
**Risk:** Medium — depends on model acceptance rate.

### #7 — Batch Size Increase (Future)
**Status:** `--batch-size 256 --ubatch-size 256`.
**Potential:** With 11GB+ VRAM headroom, increase to `512` for better batched throughput.
**Risk:** Low.

### #8 — Thread Count (Future)
**Status:** `--threads 14 --threads-batch 14` on 16-core CPU.
**Potential:** Try `--threads 16` or `--threads 22` (with HT) for faster prompt processing.
**Risk:** Low.

---

## 3. Build-Time Features (Already Enabled)

| Feature | Status | Notes |
|---------|--------|-------|
| CUDA Graphs | ✅ Built-in | Not activated at runtime |
| Flash Attention | ✅ Built-in | `GGML_CUDA_FA=ON` |
| NCCL Multi-GPU | ✅ Built-in | Not explicitly used |
| CUDA VMM | ✅ Enabled | Better memory management |
| CUDA Peer Copy | ✅ Enabled | 3090s on PCIe (no NVLink) |
| All-Quant FA | ❌ OFF | `GGML_CUDA_FA_ALL_QUANTS=OFF` — rebuilding would enable FA for all quant types |

---

## 4. Current Performance Baseline

- **GPU 0:** 20,096 MiB VRAM used, 57% util, 52°C, 226W
- **GPU 1:** 23,836 MiB VRAM used, 66% util, 42°C, 237W
- **Model size:** 37GB (Q8_K_XL)
- **Total VRAM:** 48GB → ~11GB headroom
- **Preload:** ~300W combined GPU power

---

## 5. Applied Changes Log

| Date | Change | Result |
|------|--------|--------|
| 2026-05-13 | Optimizations #1-5 applied | TBD — see daily notes |

---

*Source: OpenClaw PKB — pkb/resources/dell-llama-cpp-optimizations.md*
