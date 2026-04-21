---
name: comfyui
description: >-
  Generate images and videos via a self-hosted ComfyUI instance using its HTTP API.
  Use when the user asks to generate an image, create a video, run stable diffusion,
  use LTX, generate AI art, or interact with ComfyUI workflows. Also use when managing
  the ComfyUI server (start, stop, status, logs). NOT for editing existing images with
  CLI tools, non-diffusion AI tasks, or when the user explicitly wants a different tool.
---

# ComfyUI Skill

Interact with a self-hosted ComfyUI server via its REST API to generate images and videos.

## Server Details

- **Host:** `llama` (172.16.254.199)
- **Port:** 8188
- **Base URL:** `http://llama:8188` or `http://172.16.254.199:8188`
- **Service:** `sd-server.service` on host `llama` (via `ssh localadmin@llama`)
- **GPU:** 2× Quadro P6000 (48GB VRAM total)
- **Working dir:** `/home/localadmin/ComfyUI`
- **Venv:** `/home/localadmin/ComfyUI/venv`

## Conflict: llama-server shares the same GPUs

Both `llama-server.service` (LLM) and `sd-server.service` (ComfyUI) are enabled on `llama`. They share GPU VRAM. Before generating, verify ComfyUI is running:

```bash
ssh localadmin@llama "systemctl is-active sd-server.service"
```

If `sd-server` is inactive and `llama-server` is active, stop llama-server first:

```bash
ssh localadmin@llama "sudo systemctl stop llama-server && sudo systemctl start sd-server"
```

To swap back to LLM after generation:

```bash
ssh localadmin@llama "sudo systemctl stop sd-server && sudo systemctl start llama-server"
```

## Quick Reference

### Check server health

```bash
curl -s http://llama:8188/system_stats | python3 -m json.tool
```

### List available models

```bash
curl -s http://llama:8188/object_info | python3 -c "
import sys,json; d=json.load(sys.stdin)
for k in sorted(d):
    if 'ltx' in k.lower() or 'gguf' in k.lower():
        print(f'  {k}')
"
```

## Generating Images (VERIFIED WORKING)

ComfyUI uses **workflow JSON** (a graph of nodes) submitted via the `/prompt` API.

### ⚠️ CRITICAL: Text Encoder Setup for LTX-2.3

**DO NOT** use `CLIPLoaderGGUF` alone — it loads only the embeddings connector (768-dim),
which causes `mat1 and mat2 shapes cannot be multiplied (77x768 and 3072x768)` errors.

**USE** `DualCLIPLoaderGGUF` with BOTH files:
- `clip_name1`: `gemma-3-12b-it-qat-UD-Q4_K_XL.gguf` (the actual text encoder)
- `clip_name2`: `ltx-2.3-22b-dev_embeddings_connectors.safetensors` (the connector layer)
- `type`: `ltxv`

This is because LTX-2.3 uses Gemma 3 12B as its text encoder, not a standard CLIP model.

### Working Image Workflow (copy-paste ready)

```json
{
  "prompt": {
    "1": {
      "class_type": "UnetLoaderGGUF",
      "inputs": { "unet_name": "ltx-2.3-22b-dev-Q4_K_M.gguf" }
    },
    "2": {
      "class_type": "VAELoader",
      "inputs": { "vae_name": "ltx-2.3-22b-dev_video_vae.safetensors" }
    },
    "3": {
      "class_type": "DualCLIPLoaderGGUF",
      "inputs": {
        "clip_name1": "gemma-3-12b-it-qat-UD-Q4_K_XL.gguf",
        "clip_name2": "ltx-2.3-22b-dev_embeddings_connectors.safetensors",
        "type": "ltxv"
      }
    },
    "4": {
      "class_type": "CLIPTextEncode",
      "inputs": { "text": "YOUR POSITIVE PROMPT HERE", "clip": ["3", 0] }
    },
    "5": {
      "class_type": "CLIPTextEncode",
      "inputs": { "text": "blurry, low quality, distorted, deformed", "clip": ["3", 0] }
    },
    "6": {
      "class_type": "EmptyLatentImage",
      "inputs": { "width": 768, "height": 512, "batch_size": 1 }
    },
    "7": {
      "class_type": "KSampler",
      "inputs": {
        "seed": 42, "steps": 20, "cfg": 5.0,
        "sampler_name": "euler", "scheduler": "normal", "denoise": 1.0,
        "model": ["1", 0], "positive": ["4", 0],
        "negative": ["5", 0], "latent_image": ["6", 0]
      }
    },
    "8": {
      "class_type": "VAEDecode",
      "inputs": { "samples": ["7", 0], "vae": ["2", 0] }
    },
    "9": {
      "class_type": "SaveImage",
      "inputs": { "filename_prefix": "comfy_output", "images": ["8", 0] }
    }
  },
  "client_id": "sam-gen"
}
```

### How to submit and retrieve

```bash
# Submit workflow
curl -s -X POST http://llama:8188/prompt \
  -H "Content-Type: application/json" \
  -d @workflow.json
# Returns: {"prompt_id": "<uuid>", ...}

# Poll for completion
curl -s http://llama:8188/history/<prompt_id>
# Check status.status_str == "success" and outputs.9.images[0].filename

# Download result
curl -s "http://llama:8188/view?filename=<filename>&subfolder=&type=output" -o output.png
```

### Performance notes

- First run loads Gemma 3 12B (~12GB into RAM on CPU) + UNet (~15GB into GPU VRAM)
- Text encoding runs on CPU (slow: ~30-60s for Gemma 3 12B)
- Diffusion runs on GPU 0 at 98% utilization
- Total time: ~7 minutes for 768x512 image with 20 steps on P6000
- Subsequent runs with cached models are faster

### Supported modes

| Mode | Model | Notes |
|------|-------|-------|
| `image` | LTX-2.3 22B Q4_K_M | Verified working — use workflow above |
| `video` | LTX-2.3 22B Q4_K_M | TODO: needs LTXVScheduler + SamplerCustom + video decode/save workflow |

### Available LTX-2.3 models on server

| File | Path |
|------|------|
| Diffusion (GGUF) | `unet/ltx-2.3-22b-dev-Q4_K_M.gguf` |
| Video VAE | `vae/ltx-2.3-22b-dev_video_vae.safetensors` |
| Audio VAE | `vae/ltx-2.3-22b-dev_audio_vae.safetensors` |
| Embeddings connector | `text_encoders/ltx-2.3-22b-dev_embeddings_connectors.safetensors` |
| Gemma 3 12B text enc | `text_encoders/gemma-3-12b-it-qat-UD-Q4_K_XL.gguf` |

## Service Management

```bash
# Status
ssh localadmin@llama "sudo systemctl status sd-server --no-pager -l"

# Logs (last 50 lines)
ssh localadmin@llama "sudo journalctl -u sd-server -n 50 --no-pager"

# Restart
ssh localadmin@llama "sudo systemctl restart sd-server"

# GPU usage
ssh localadmin@llama "nvidia-smi --query-gpu=name,memory.used,memory.free --format=csv"
```

## Workflow Customization

For advanced workflows (img2vid, upscaling, LoRA, multi-stage), read `references/api-guide.md` for the full ComfyUI API reference and workflow JSON format.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Connection refused on :8188 | `sd-server` not running — start it |
| OOM / CUDA out of memory | Reduce resolution, reduce video frames, or stop llama-server |
| Slow generation | Expected on P6000 (Pascal arch). 48GB VRAM but older compute |
| Model not found | Check symlinks in `/home/localadmin/ComfyUI/models/` |
| mat1/mat2 shape mismatch (77x768 vs 3072x768) | Using wrong CLIP loader. Use `DualCLIPLoaderGGUF` with Gemma + connector, NOT `CLIPLoaderGGUF` alone |
| `ckpt_name` empty in LTXAVTextEncoderLoader | `.gguf` not in `supported_pt_extensions`. Use `DualCLIPLoaderGGUF` instead |
| `checkpoints` folder shows empty list | Only `.safetensors`/`.ckpt`/`.pt` supported there, not `.gguf`. GGUF models go in `unet/` or `text_encoders/` |
