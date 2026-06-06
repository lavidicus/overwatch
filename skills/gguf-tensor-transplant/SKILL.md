---
name: gguf-tensor-transplant
description: >
  Transplant extra tensors (e.g. MTP/next-token-prediction layers) from one GGUF
  file into another, producing a mixed-quantization GGUF. Use when the user asks
  to graft MTP blocks onto a base model GGUF, merge extra blk.NNN.* tensors into
  a quantized model, create mixed-quant GGUFs, transplant nextn_predict layers,
  or combine Q8_0 MTP weights with an IQ4_KS base. Triggers on: transplant, graft,
  MTP merge, mixed-quant GGUF, add MTP layers, next-token-prediction graft,
  convert.py GGUF, tensor transplant.
---

# GGUF Tensor Transplant

Transplant extra tensors (MTP / next-token-prediction blocks) from a source GGUF
into a target GGUF, producing a mixed-quantization output file that preserves
exact on-disk layout including per-row metadata (critical for IQ4_KS and similar
quantizations with `row_meta_size > 0`).

## Prerequisites

Install the `gguf` Python package (from ggml-org/llama.cpp):

```bash
pip install gguf
```

Requires Python 3.8+. No GPU or CUDA needed — pure file I/O.

## Usage

```bash
python3 convert.py <target.gguf> <source.gguf> <output.gguf>
```

| Argument | Meaning |
|----------|---------|
| `target` | Base GGUF — tensors + metadata kept as-is |
| `source` | GGUF with extra blocks to graft (e.g. blk.64.* for MTP) |
| `output` | Resulting mixed-quantization GGUF |

### Example

```bash
# Graft Q8_0 MTP blocks onto an IQ4_KS base model
python3 convert.py Qwen3.6-27B-IQ4_KS.gguf Qwen3.6-27B-MTP-Q8_0.gguf Qwen3.6-27B-MTP-IQ4_KS.gguf
```

## How It Works

1. Reads both GGUF files via `GGUFReader`
2. Extracts architecture (`general.architecture`), block counts, and `nextn_predict_layers`
3. Identifies extra tensors in source matching `blk.<target_block_count>.*`
4. Writes output with: all target tensors + source extra tensors, merged KV metadata
5. Preserves exact on-disk offsets (including per-row metadata for row-meta quantizations)
6. Validates output by re-reading and spot-checking SHA-256 hashes of tensors

## Common Patterns

### Grafting MTP to a quantized base

```bash
# Target: quantized base model (e.g. IQ4_KS)
# Source: full-precision MTP model (e.g. Q8_0 or FP16)
python3 convert.py base-IQ4_KS.gguf mtp-Q8_0.gguf output-IQ4_KS+MTP.gguf
```

### Checking what blocks a model has

```bash
# Use gguf_dump to inspect block counts before grafting
python3 -m gguf.scripts.gguf_dump <model.gguf> | grep block_count
```

### Verifying output

The script auto-validates. For extra checks:

```bash
python3 -m gguf.scripts.gguf_dump output.gguf | grep -E '(block_count|nextn_predict|blk\.64)'
```

## Error Conditions

- **No `general.architecture` in target** — invalid GGUF
- **No `nextn_predict_layers` in source** — not an MTP model
- **No `blk.<target_block_count>.*` tensors in source** — source doesn't have extra blocks to graft
- **Validation fails** — tensor data mismatch (rare, indicates corrupt input)

## Script Location

The convert script is bundled at `scripts/convert.py` relative to this skill directory.
