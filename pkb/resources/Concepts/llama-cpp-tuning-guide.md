# llama.cpp Server — Tuning Guide

## Quick Reference: What Affects What

| Parameter | Category | Affects Accuracy? |
|-----------|----------|-------------------|
| `-b` (batch size) | Performance | ❌ No |
| `-ub` (ubatch size) | Performance | ❌ No |
| `--ctx-size` | Capacity | ⚠️ Indirectly (very long contexts) |
| `--temp` | Output quality | ✅ Yes |
| `--top-p` | Output quality | ✅ Yes |
| `--top-k` | Output quality | ✅ Yes |
| `--min-p` | Output quality | ✅ Yes |
| Quantization level | Model fidelity | ✅ Yes |
| `--threads` | Performance | ❌ No |
| KV cache type | Performance/accuracy | ⚠️ Slight (quantized cache) |

---

## Batch Sizes (-b and -ub) — The Relationship

**Neither batch size nor ubatch size affects model accuracy.** They are purely memory/performance knobs. Given the same seed and prompt, output is identical regardless of batch values.

### The Golden Rule: `-b` must be >= `-ub`. Period.

They serve different layers of the pipeline:

| Parameter | What it is | Analogy |
|-----------|-----------|---------|
| **-b** (batch size) | Logical max tokens per forward pass (the "container") | Size of the truck |
| **-ub** (ubatch size) | Physical max tokens per GPU compute step (the "actual load") | How much you actually put in the truck |

The server's continuous batching scheduler packs requests into a logical batch up to `-b`, then if that exceeds `-ub`, it splits into multiple physical compute steps. So **`-ub` is your VRAM ceiling** and **`-b` is your scheduling ceiling**.

### What they actually control:

| Parameter | What it controls | VRAM impact | Speed impact |
|-----------|-----------------|-------------|--------------|
| **-b** (batch size) | Logical max tokens the scheduler can pack per iteration | High — proportional to context window × parallel slots | Better throughput for concurrent requests; gives scheduler flexibility |
| **-ub** (ubatch size) | Physical max tokens sent to the GPU in a single compute step | Medium — peak per-step VRAM | Higher = faster prompt processing (fewer forward passes per prompt) |

### Why people think batch size affects accuracy:

It doesn't. The confusion usually comes from mixing up batch size with **context window** (`--ctx-size`). Very long contexts *can* degrade quality due to attention dilution — that's a real effect, but it's about context length, not batch size.

### How to decide the values

**Step 1: Set `-ub` based on VRAM headroom**

This is the real speed knob. Higher `-ub` = faster prompt processing because you do fewer forward passes per prompt. On the RTX 3090 (24GB each, 48GB total), a higher `-ub` is almost always better as long as VRAM allows.

**L3 cache tip:** Matching `-ub` to your GPU's L3 cache size in MB can dramatically speed prompt processing for 27B+ models. RTX 3090 has **64MB L3 cache**, so `-ub 64` is a notable sweet spot for prompt eval. But higher values (512, 1024) are better for pure throughput when VRAM allows.

**Step 2: Set `-b` as a multiple of `-ub` based on concurrency**

| Scenario | Recommended ratio | Example |
|----------|------------------|---------|
| Single-user (`-np 1`) | `-b = ub` or `-b = 2 × ub` | `-b 256 -ub 256` |
| Multi-user (2–4 users) | `-b = 2 × ub` | `-b 512 -ub 256` |
| High-throughput API | `-b = 4 × ub` or more | `-b 2048 -ub 512` |

For single-user, a large `-b` wastes VRAM on empty KV cache slots — the scheduler only ever has one stream to pack. For multi-user, `-b` needs headroom above `-ub` so the scheduler can interleave requests efficiently.

### Current production values (pve3090-111):

```
-b 256 -ub 256 -np 1
```

**Analysis:** Tightest fit for single-user. 512 was tested and 256 chosen as the tighter fit — less KV cache overhead with no speed penalty.

**Current production values (node2 — 2x P6000):**

```
-b 512 -ub 512 -np 1
```

Raised to 512 for better prompt throughput (~660 tok/s vs ~159 with 256). P6000s have 24GB each (48GB total), less constrained than assumed. MTP confirmed harmful — `--spec-type none` is optimal.

### Tuning guidance:

- **If VRAM is tight:** lower `-ub` first, then `-b`
- **If prompt processing is slow:** raise `-ub` until VRAM pressure
- **If generation speed is slow:** raise `-ub` (not `-b`)
- **If GPU utilization is low:** raise `-b` to give the scheduler more room
- **For single-user:** make `-b = ub`, prioritize higher `-ub`
- **For multi-user:** keep `-ub` at VRAM limit, set `-b = 2 × ub` or more
- **If queues are full:** increase `-np` (parallel sequences), not batch size
- **If GPU utilization is low:** increase `-b` or `-ub`

---

## Sampling Parameters (These DO Affect Output)

### `--temp` (Temperature)

Controls randomness of token selection.

| Value | Behavior | Use case |
|-------|----------|----------|
| 0.0 | Deterministic (greedy) | Code, factual Q&A |
| 0.2–0.4 | Very focused | Technical writing, precision tasks |
| **0.6** | Balanced | **Current default — good general purpose** |
| 0.7–0.8 | Creative | Storytelling, brainstorming |
| 0.9+ | Very random | Poetry, wild ideation |

**Current:** `--temp 0.6` — solid general-purpose default.

### `--top-p` (Nucleus Sampling)

Only considers tokens whose cumulative probability exceeds `top-p`.

| Value | Behavior |
|-------|----------|
| 0.5 | Very restrictive — only top tokens |
| 0.7 | Restrictive |
| **0.95** | Balanced — **current default** |
| 1.0 | No restriction (all tokens considered) |

**Current:** `--top-p 0.95` — good balance of quality and variety.

### `--top-k`

Only considers the top K most likely tokens at each step.

| Value | Behavior |
|-------|----------|
| 5–10 | Very focused |
| **20** | Balanced — **current default** |
| 50 | More varied |
| 100+ | Very open |

**Current:** `--top-k 20` — tight enough to avoid nonsense, loose enough for natural language.

### `--min-p`

Minimum probability relative to best token. Filters out very unlikely tokens.

| Value | Behavior |
|-------|----------|
| 0.0 | No filtering |
| **0.00** | **Current default — no minimum** |
| 0.05–0.1 | Mild filtering |
| 0.1–0.2 | Strong filtering |

**Current:** `--min-p 0.00` — no minimum filter. Can increase to 0.05 if you see occasional nonsense tokens.

---

## Context Window (`--ctx-size`)

Controls maximum context length in tokens.

| Value | VRAM impact | Notes |
|-------|-------------|-------|
| 4096 | Minimal | Short conversations |
| 8192 | Low | Standard usage |
| 32768 | Medium | Longer documents |
| 131072 | **High — current** | Very long context |
| 262144 | Very high | Full oll VM capacity |

**⚠️ Very long contexts (128K+) can degrade quality** due to attention dilution — the model's attention mechanism spreads thinner across more tokens. This is the closest thing to "accuracy loss" that batch size gets confused with.

**Current:** `--ctx-size 131072` (128K) on pve3090-111. oll VM runs 262K.

**Rule of thumb:** Only increase context window when you actually need it. A 4K context with the same model is often *better* than 128K for short tasks.

---

## KV Cache Quantization (`--cache-type-k`, `--cache-type-v`)

Controls quantization of the KV cache (key/value attention buffers).

| Setting | VRAM savings | Quality impact |
|---------|-------------|----------------|
| f16 | None (full precision) | Best |
| q8_0 | ~50% | Negligible |
| q4_0 | ~75% | Slight |
| q3_K | ~85% | Noticeable on long contexts |

**Current:** `--cache-type-k q8_0 --cache-type-v q8_0` — excellent choice. Near-f16 quality with half the KV cache VRAM.

**Trade-off:** KV cache quantization can cause slight quality degradation on very long contexts (128K+). For most usage, q8_0 is the sweet spot.

---

## CUDA / GPU Settings

### `--n-gpu-layers all`

Offloads all layers to GPU. Best performance. Alternative: specify a number to leave some layers on CPU.

### `--flash-attn on`

Enables Flash Attention 2. Reduces VRAM usage and speeds up inference. **Keep enabled** — no downsides.

### `--threads` / `--threads-batch`

CPU threads for non-GPU work. Set to your available core count.

**Current:** `--threads 14 --threads-batch 14` (2x RTX 3090 on pve3090-111).

---

## MTP (Multi-Token Prediction) / Speculative Decoding

Speculative decoding generates draft tokens ahead of the main model and verifies them in a single batch. llama.cpp supports MTP (model-internal draft layers) and external draft models.

### `-ts` is NOT a temperature schedule

`-ts` = `--tensor-split` — controls how model layers are split across GPUs (comma-separated layer counts per GPU). Example: `-ts 13,13` = 13 layers to GPU 0, 13 to GPU 1.

### MTP Performance Findings (Qwen3.6-35B on P6000s)

MTP acceptance rate was tested across configurations:

| Config | Generation Speed | Draft Acceptance | Verdict |
|--------|-----------------|-----------------|---------|
| `--spec-type mtp --spec-draft-n-max 3` | 50.5 tok/s | 54% | Barely helps, hurts prompt processing |
| `--spec-type mtp --spec-draft-n-max 8` | 30.8 tok/s | 23% | **Worse** — too many wrong drafts |
| `--spec-type none` | **51.6 tok/s** | N/A | **Best performance** |

**Conclusion: MTP is NOT beneficial on P6000s with Qwen3.6-35B.** The 54% draft acceptance rate means the main model spends more time verifying wrong drafts than generating tokens. At n-max=8, acceptance drops to 23% and generation slows by 40%. Prompt processing is 25% slower with MTP enabled.

**Recommendation: `--spec-type none`** for P6000s. MTP may be worth trying on newer GPUs (RTX 3090+) with higher acceptance rates — pve3090-111 still has `--spec-type mtp --spec-draft-n-max 3` running.

### Speculative Decoding Parameters

| Parameter | Description | Default | Notes |
|-----------|-------------|---------|-------|
| `--spec-type` | Speculative decoding type | `none` | Options: `mtp`, `ngram-simple`, `ngram-map-k`, `ngram-map-k4v`, `ngram-mod`, `none` |
| `--spec-draft-n-max` | Max draft tokens per step | `16` | Higher = more drafts but lower acceptance |
| `--spec-draft-n-min` | Min draft tokens to use | `0` | |
| `--spec-draft-p-split` | Split probability threshold | `0.10` | |
| `--spec-draft-p-min` | Min probability (greedy) | `0.75` | |
| `--spec-draft-model` | External draft model path | unused | Alternative to MTP |

### Tensor Split (`-ts`)

Controls how model layers are distributed across GPUs.

| Setting | GPU 0 | GPU 1 | Notes |
|---------|-------|-------|-------|
| `-ts 10,12` (old) | 10 layers | 12 layers | Unbalanced — GPU 1 overloaded |
| `-ts 13,13` (current) | 13 layers | 13 layers | Balanced — both GPUs share load |

Model has 27 layers + MTP layers. `-ts 13,13` uses 26 layers across GPUs, leaving 1 layer + MTP on CPU. This balanced the VRAM usage from 20.1/23.6 GB to 19.1/21.2 GB (GPU 0/GPU 1).

---

## Performance Comparison

Benchmark: Calculate pi to 50 decimal places, same model (Qwen3.6-35B Q4_K_M), same prompt.

### pve3090-111 (2x RTX 3090, 48GB VRAM total)

| Metric | Value |
|--------|-------|
| **Generation speed** | **115.6 tok/s** |
| **Prompt speed** | **179 tok/s** |
| **Draft acceptance** | 50% (33/66) |
| **VRAM (GPU 0)** | 20.2 GB / 24 GB |
| **VRAM (GPU 1)** | 24.0 GB / 24 GB |
| **Config** | `-b 256 -ub 256 --spec-type mtp --spec-draft-n-max 3 -ts 10,12` |

### node2 (2x Quadro P6000, 48GB VRAM total)

| Metric | Value |
|--------|-------|
| **Generation speed** | **~44 tok/s** (2026-05-13 live test, 512 tok output) |
| **Prompt speed** | **~660 tok/s** (2026-05-13 live test, 64 prompt tokens) |
| **Speculative decoding** | Disabled (`--spec-type none`) |
| **VRAM (GPU 0)** | ~20 GB / 24 GB |
| **VRAM (GPU 1)** | ~20 GB / 24 GB |
| **Config** | `-b 512 -ub 512 --spec-type none -ts 13,13` |

### Comparison (2026-05-13)

| Metric | RTX 3090s (pve3090-111) | P6000s (node2) | Dell vLLM |
|--------|------------------------|----------------|----------|
| Generation | ~115 tok/s | **~44 tok/s** | **~193 tok/s** |
| Prompt | ~179 tok/s | **~660 tok/s** | N/A |
| VRAM (GPU 0) | 20.2 GB / 24 GB | ~20 GB / 24 GB | — |
| VRAM (GPU 1) | 24.0 GB / 24 GB | ~20 GB / 24 GB | — |
| Architecture | Turing (RTX 3090) | Turing (P6000) | Blackwell (RTX 6000) |
| VRAM total | 48 GB | 48 GB | 96 GB |
| Runtime | llama.cpp + MTP | llama.cpp bare | vLLM |
| Model | Qwen3.6-35B Q4_K_M | Qwen3.6-35B Q4_K_M | Qwen3-Next-FP8 |

**Key findings:**
- Dell vLLM dominates generation speed (193 tok/s) thanks to Blackwell architecture + PagedAttention scheduler + 96GB VRAM
- node2 prompt processing is actually **faster** than pve3090 (660 vs 179 tok/s) — larger `-ub 512` vs 256 helps significantly
- P6000s are ~2.6x slower than 3090s at generation despite same VRAM — older Turing architecture, lower memory bandwidth
- P6000s are ~4.4x slower than Dell at generation — Blackwell + vLLM vs Turing + llama.cpp
- MTP is confirmed harmful on P6000s; `--spec-type none` is optimal
- `-b 512 -ub 512` is the current production config (raised from 256 for better prompt throughput)

### Historical benchmarks (for reference)

| Date | Config | Gen Speed | Notes |
|------|--------|-----------|-------|
| 2026-05-13 | `-b 512 -ub 512 --spec-type none` | ~44 tok/s | Live test, 512 tok output |
| 2026-05-13 | `-b 256 -ub 256 --spec-type none` | ~51 tok/s | Prior test (lower ubatch, slower prompt but slightly faster gen) |
| 2026-05-13 | `-b 256 -ub 256 --spec-type mtp --spec-draft-n-max 3` | ~50.5 tok/s | MTP barely helped, hurt prompt processing |
| 2026-05-13 | `-b 256 -ub 256 --spec-type mtp --spec-draft-n-max 8` | ~30.8 tok/s | MTP n-max=8 was worse |
| 2026-05-13 | `-b 256 -ub 256 -ts 13,13 --spec-type none` | ~51.6 tok/s | Baseline before ubatch change |
| 2026-03-19 | `-b 256 -ub 256 -ts 13,13 --spec-type none` | ~51.2 tok/s | Earlier benchmark |

The RTX 3090s are significantly faster at generation (2.3x) due to newer architecture and higher memory bandwidth. Prompt processing is closer (1.1x) since both are bottlenecked by the same model size. The P6000s benefit from the balanced `-ts 13,13` split — both GPUs at ~20 GB vs the 3090s where GPU 1 is nearly full.

---

## Practical Tuning Recommendations

### For pve3090-111 (2x RTX 3090, 48GB VRAM total):

```
-b 256 -ub 256 --ctx-size 131072
```

- **Current:** `-b 256 -ub 256` — tightest fit for single-user
- Single-user (`-np 1`), so `-b = ub` is optimal — no wasted KV cache slots
- Conservative but efficient; 512 was tested and 256 chosen as the tighter fit

### For oll VM (1x RTX 3090, 24GB VRAM):

```
-b 1024 -ub 512 --ctx-size 262144 --cache-type-k q4_0 --cache-type-v q4_0
```

- oll already has higher values (larger context, more VRAM pressure)
- q4_0 cache is acceptable on oll since context is 262K (q8_0 would OOM)

### For VRAM-constrained setups (8–12GB):

```
-b 256 -ub 128 --ctx-size 8192 --cache-type-k q4_0 --cache-type-v q4_0
```

- Lower batch/ubatch to fit in VRAM
- Reduce context window
- Use q4_0 cache

---

## Current Production Configs

### pve3090-111 (2x RTX 3090)

```bash
llama-server \
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
  --jinja \
  --reasoning off \
  --reasoning-budget 0 \
  --metrics \
  -np 1 \
  --flash-attn on \
  -ts 10,12 \
  --spec-type mtp \
  --spec-draft-n-max 3
```

**Current:** `-b 256 -ub 256` — tightest fit for single-user. 512 was tested and 256 chosen as the tighter fit.

### node2 (2x Quadro P6000)

```bash
llama-server \
  -m /opt/models/gguf/llamacpp.gguf \
  --mmproj /opt/models/gguf/Qwen3.6-35B/mmproj-F16.gguf \
  --host 0.0.0.0 --port 11434 \
  --ctx-size 131072 \
  --n-gpu-layers all \
  -b 512 -ub 512 \
  --temp 0.6 --top-p 0.95 --top-k 20 --min-p 0.00 \
  --threads 14 --threads-batch 14 \
  --cache-type-k q8_0 --cache-type-v q8_0 \
  --cache-ram 8192 \
  --jinja \
  --reasoning off \
  --reasoning-budget 0 \
  --metrics \
  --spec-type none \
  -np 1 \
  --flash-attn on \
  -ts 13,13
```

**Key differences from pve3090-111:**
- `--spec-type none` — MTP tested and found harmful (54% acceptance, slower generation)
- `-ts 13,13` — balanced tensor split (was 10,12 which overloaded GPU 1)
- `-b 512 -ub 512` — raised from 256 for better prompt throughput (~660 tok/s)
- Live benchmark (2026-05-13): ~44 tok/s generation, ~660 tok/s prompt processing
- VRAM: ~20 GB / ~20 GB (GPU 0 / GPU 1) — well balanced

### oll VM (1x RTX 3090)

```bash
--ctx-size 262144
-np 1
-fa on
-b 1024
-ub 512
--threads 16
--cache-type-k q4_0
--cache-type-v q4_0
--jinja
--reasoning off
```

---

## Links

- Oll VM docs: [[llama-cpp-server-olla]]
- Rebuild playbook: [[llama-cpp-rebuild-upgrade]]
- MTP/speculative decoding: llama.cpp source `src/speculative.c`
