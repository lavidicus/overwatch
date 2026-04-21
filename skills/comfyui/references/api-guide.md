# ComfyUI API Guide

## Base URL

`http://llama:8188` (or `http://172.16.254.199:8188`)

## Core Endpoints

### System

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/system_stats` | GET | Server stats, GPU info, queue depth |
| `/object_info` | GET | All available node types and their inputs |
| `/object_info/{node_type}` | GET | Info for a specific node type |
| `/queue` | GET | Current queue status |
| `/interrupt` | POST | Cancel current generation |

### Prompt Execution

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/prompt` | POST | Queue a workflow for execution |
| `/history` | GET | All execution history |
| `/history/{prompt_id}` | GET | History for specific prompt |
| `/view?filename=X&subfolder=Y` | GET | Download output file |

### Workflow Format

A workflow is a JSON dict of node objects keyed by string IDs:

```json
{
  "1": {
    "class_type": "NodeTypeName",
    "inputs": {
      "param1": "value",
      "param2": ["other_node_id", output_index]
    }
  }
}
```

Node connections use `["node_id", output_index]` tuples.

### Queue a Prompt

```bash
curl -s -X POST http://llama:8188/prompt \
  -H "Content-Type: application/json" \
  -d '{"prompt": { ... workflow JSON ... }, "client_id": "my-id"}'
```

Response: `{"prompt_id": "uuid", "number": 5, "node_errors": {}}`

### Poll for Completion

```bash
curl -s http://llama:8188/history/<prompt_id>
```

When complete, response contains `outputs` with filenames.

## Key LTX-2.3 Node Types

### UnetLoaderGGUF
Load the GGUF diffusion model.
- `unet_name`: filename in `models/unet/` or `models/diffusion_models/`

### CLIPLoaderGGUF
Load GGUF text encoder.
- `clip_name`: filename in `models/text_encoders/`
- `type`: `"ltxv"` for LTX models

### LTXVAudioVAELoader
Load video + audio VAE.
- `video_vae_name`: filename in `models/vae/`
- `audio_vae_name`: filename in `models/vae/`

### EmptyLTXVLatentVideo
Create empty latent for generation.
- `width`, `height`: resolution (multiples of 32, max ~1280x720 for 48GB VRAM)
- `length`: frame count (97 = ~4s at 24fps)
- `batch_size`: 1

### LTXVScheduler
Configure diffusion schedule.
- `steps`: 20 (dev model) or 4-8 (distilled)
- `max_shift`, `base_shift`: noise schedule params
- `model`: connection to UnetLoaderGGUF

### LTXVConditioning
Wrap CLIP outputs for LTX sampling.
- `positive`, `negative`: CLIP text encode outputs
- `frame_rate`: 24

### SamplerCustom
Run diffusion sampling.
- `cfg`: guidance scale (3.0-7.0 typical)
- `noise_seed`: reproducibility seed

## Resolution and VRAM Guidelines

| Resolution | Frames | Approx VRAM | Notes |
|-----------|--------|-------------|-------|
| 512x512 | 97 | ~20GB | Safe for single P6000 |
| 768x512 | 97 | ~30GB | Needs both GPUs or offload |
| 768x512 | 49 | ~22GB | Shorter clip, single GPU |
| 1280x720 | 97 | ~45GB+ | Needs both GPUs, may OOM |

Reduce frames or resolution if OOM occurs. Use `--offload-to-cpu` in service args if needed.

## WebSocket API (Advanced)

ComfyUI supports WebSocket at `ws://llama:8188/ws?clientId=<uuid>` for real-time progress updates. Messages include:
- `execution_start` — generation begins
- `executing` — node being processed
- `progress` — step progress within a node
- `executed` — node completed with outputs
- `execution_complete` — all done
